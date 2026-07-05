import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody } from "@/lib/api-helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req)
  const ar = await db.accessRequest.findUnique({ where: { id } })
  if (!ar) return notFound("Access request not found")
  const updated = await db.accessRequest.update({ where: { id }, data: { status: "Revoked" } })
  return ok(updated)
}
