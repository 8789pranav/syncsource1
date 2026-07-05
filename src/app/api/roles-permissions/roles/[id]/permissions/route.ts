import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound } from "@/lib/api-helpers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = await db.role.findUnique({
    where: { id },
    include: {
      modulePermissions: true,
      pagePermissions: true,
      actionPermissions: true,
      fieldPermissions: true,
      dataScopes: true,
    },
  })
  if (!role) return notFound("Role not found")
  return ok(role)
}
