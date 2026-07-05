import { ok, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-candidates/[candidateId] — full candidate detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params
  const tenantId = await ensureTenant()
  const cand = await db.onboardingCandidate.findFirst({
    where: { id: candidateId, tenantId },
    include: {
      workflow: {
        include: { stages: { orderBy: { order: "asc" }, include: { taskTemplates: { orderBy: { order: "asc" } } } } },
      },
      currentStage: true,
      instance: {
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: { stage: { select: { id: true, name: true, color: true, order: true, slaDays: true, icon: true } } },
          },
          tasks: { orderBy: { order: "asc" } },
        },
      },
      notes: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!cand) return bad("Candidate not found", 404)
  return ok(cand)
}

// PATCH /api/onboarding-candidates/[candidateId] — update candidate meta (not stage)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const cand = await db.onboardingCandidate.findFirst({ where: { id: candidateId, tenantId } })
  if (!cand) return bad("Candidate not found", 404)

  const {
    candidateName, email, phone, employeeCode, designation, department,
    grade, employmentType, joinDate, reportTo, priority, avatarColor,
    tags, ownerId, status,
  } = body as any

  const updated = await db.onboardingCandidate.update({
    where: { id: candidateId },
    data: {
      candidateName, email, phone, employeeCode, designation, department,
      grade, employmentType,
      joinDate: joinDate ? new Date(joinDate) : undefined,
      reportTo, priority, avatarColor,
      tags: tags ? JSON.stringify(tags) : undefined,
      ownerId,
      status,
      completedAt: status === "Completed" ? new Date() : undefined,
    },
    include: { currentStage: true, workflow: true },
  })
  return ok(updated)
}

// DELETE /api/onboarding-candidates/[candidateId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params
  const tenantId = await ensureTenant()
  const cand = await db.onboardingCandidate.findFirst({ where: { id: candidateId, tenantId } })
  if (!cand) return bad("Candidate not found", 404)
  await db.onboardingCandidate.delete({ where: { id: candidateId } })
  return ok({ deleted: true })
}
