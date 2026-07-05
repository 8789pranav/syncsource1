import { ok, notFound, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const checklist = await db.onboardingChecklist.findUnique({
    where: { id },
    include: { tasks: { orderBy: { order: "asc" } } },
  })
  if (!checklist || checklist.tenantId !== tenantId) return notFound()
  return ok(checklist)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const existing = await db.onboardingChecklist.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()

  const body = await parseBody(req)
  const { name, description, category, scopeType, entityId, departmentId, employeeType, isDefault, status, version } = body as any

  if (isDefault && !existing.isDefault) {
    await db.onboardingChecklist.updateMany({
      where: { tenantId, category: category || existing.category, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const updated = await db.onboardingChecklist.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(scopeType !== undefined ? { scopeType } : {}),
      ...(entityId !== undefined ? { entityId: entityId || null } : {}),
      ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
      ...(employeeType !== undefined ? { employeeType: employeeType || null } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(version !== undefined ? { version } : {}),
    },
    include: { tasks: { orderBy: { order: "asc" } } },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const existing = await db.onboardingChecklist.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()
  await db.onboardingChecklist.delete({ where: { id } })
  return ok({ deleted: true })
}
