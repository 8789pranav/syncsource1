import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-candidates/[candidateId]/notes
export async function GET(_req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params
  const tenantId = await ensureTenant()
  const cand = await db.onboardingCandidate.findFirst({ where: { id: candidateId, tenantId } })
  if (!cand) return bad("Candidate not found", 404)
  const notes = await db.onboardingNote.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
  })
  return ok({ items: notes })
}

// POST /api/onboarding-candidates/[candidateId]/notes
export async function POST(req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { body: noteBody, authorName, authorId, stageId } = body as any
  if (!noteBody) return bad("body is required")
  const cand = await db.onboardingCandidate.findFirst({ where: { id: candidateId, tenantId } })
  if (!cand) return bad("Candidate not found", 404)
  const note = await db.onboardingNote.create({
    data: { tenantId, candidateId, body: noteBody, authorName, authorId, stageId },
  })
  return created(note)
}
