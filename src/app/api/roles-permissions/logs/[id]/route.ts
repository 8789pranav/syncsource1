import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound } from "@/lib/api-helpers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const log = await db.permissionAuditLog.findUnique({ where: { id } })
  if (!log) return notFound("Log not found")
  return ok(log)
}
