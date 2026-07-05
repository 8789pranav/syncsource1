import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok } from "@/lib/api-helpers"
import { MODULES } from "@/lib/permissions-constants"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const roleType = searchParams.get("roleType") || ""
  const group = searchParams.get("group") || ""

  const where: any = { tenantId: DEFAULT_TENANT_ID, status: "Active" }
  if (roleType) where.roleType = roleType

  const roles = await db.role.findMany({
    where,
    include: { modulePermissions: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  })

  const modulePerms = await db.roleModulePermission.findMany({ where: { tenantId: DEFAULT_TENANT_ID } })
  const cellMap = new Map<string, string>()
  for (const mp of modulePerms) cellMap.set(`${mp.roleId}|${mp.module}`, mp.accessLevel)

  const modules = group ? MODULES.filter(m => m.group === group) : MODULES
  const cells = []
  for (const role of roles) {
    for (const m of modules) {
      cells.push({ roleId: role.id, module: m.id, accessLevel: cellMap.get(`${role.id}|${m.id}`) || "NoAccess" })
    }
  }

  return ok({ modules: modules.map(m => ({ id: m.id, label: m.label, group: m.group, riskLevel: m.riskLevel })), roles: roles.map(r => ({ id: r.id, name: r.name, code: r.code, roleType: r.roleType, isSystem: r.isSystem })), cells })
}
