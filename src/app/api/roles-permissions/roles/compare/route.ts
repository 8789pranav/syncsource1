import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, bad } from "@/lib/api-helpers"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const a = searchParams.get("a")
  const b = searchParams.get("b")
  if (!a || !b) return bad("Both role ids a and b are required")

  const [roleA, roleB] = await Promise.all([
    db.role.findUnique({ where: { id: a }, include: { modulePermissions: true, fieldPermissions: true, actionPermissions: true } }),
    db.role.findUnique({ where: { id: b }, include: { modulePermissions: true, fieldPermissions: true, actionPermissions: true } }),
  ])
  if (!roleA || !roleB) return bad("One or both roles not found", 404)

  return ok({ roleA, roleB })
}
