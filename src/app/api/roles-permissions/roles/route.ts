import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest) {
  const tenantId = DEFAULT_TENANT_ID
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const roleType = searchParams.get("roleType") || ""
  const status = searchParams.get("status") || ""
  const riskLevel = searchParams.get("riskLevel") || ""

  const where: any = { tenantId }
  if (q) where.OR = [{ name: { contains: q } }, { code: { contains: q } }, { description: { contains: q } }]
  if (roleType) where.roleType = roleType
  if (status) where.status = status
  if (riskLevel) where.riskLevel = riskLevel

  const roles = await db.role.findMany({
    where,
    include: {
      modulePermissions: true,
      _count: { select: { userRoles: true } },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  })
  return ok({ items: roles })
}

export async function POST(req: NextRequest) {
  const tenantId = DEFAULT_TENANT_ID
  await ensureTenant()
  const body = await parseBody(req)
  const { name, code, description, roleType, riskLevel, effectiveFrom, effectiveTo, status, isDefault, entityScope, modulePermissions, pagePermissions, actionPermissions, fieldPermissions, dataScopes } = body

  if (!name || !code) return bad("Name and code are required")
  const existing = await db.role.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Role with this code already exists", 409)

  const role = await db.role.create({
    data: {
      tenantId, name, code,
      description: description || null,
      roleType: roleType || "Custom",
      riskLevel: riskLevel || "Low",
      status: status || "Active",
      isDefault: !!isDefault,
      isSystem: false,
      entityScope: entityScope || null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
    },
  })

  if (Array.isArray(modulePermissions) && modulePermissions.length) {
    await db.roleModulePermission.createMany({
      data: modulePermissions.map((mp: any) => ({
        tenantId, roleId: role.id, module: mp.module,
        accessLevel: mp.accessLevel || "NoAccess",
        riskLevel: mp.riskLevel || "Low",
      })),
    })
  }
  if (Array.isArray(pagePermissions) && pagePermissions.length) {
    await db.rolePagePermission.createMany({
      data: pagePermissions.map((pp: any) => ({
        tenantId, roleId: role.id, module: pp.module, page: pp.page,
        canView: !!pp.canView, canCreate: !!pp.canCreate, canEdit: !!pp.canEdit,
        canDelete: !!pp.canDelete, canApprove: !!pp.canApprove, canExport: !!pp.canExport,
        canImport: !!pp.canImport, canDownload: !!pp.canDownload, canUpload: !!pp.canUpload,
      })),
    })
  }
  if (Array.isArray(actionPermissions) && actionPermissions.length) {
    await db.roleActionPermission.createMany({
      data: actionPermissions.map((ap: any) => ({
        tenantId, roleId: role.id, module: ap.module, action: ap.action,
        allowed: !!ap.allowed, riskLevel: ap.riskLevel || "Low",
      })),
    })
  }
  if (Array.isArray(fieldPermissions) && fieldPermissions.length) {
    await db.roleFieldPermission.createMany({
      data: fieldPermissions.map((fp: any) => ({
        tenantId, roleId: role.id, module: fp.module, field: fp.field,
        access: fp.access || "Hidden", riskLevel: fp.riskLevel || "Low",
      })),
    })
  }
  if (Array.isArray(dataScopes) && dataScopes.length) {
    await db.roleDataScope.createMany({
      data: dataScopes.map((ds: any) => ({
        tenantId, roleId: role.id, ruleId: ds.ruleId || null,
        scopeType: ds.scopeType || "All",
        entityId: ds.entityId || null,
        branchIds: ds.branchIds ? JSON.stringify(ds.branchIds) : null,
        locationIds: ds.locationIds ? JSON.stringify(ds.locationIds) : null,
        departmentIds: ds.departmentIds ? JSON.stringify(ds.departmentIds) : null,
        gradeIds: ds.gradeIds ? JSON.stringify(ds.gradeIds) : null,
        employeeTypeIds: ds.employeeTypeIds ? JSON.stringify(ds.employeeTypeIds) : null,
        includeEmployees: ds.includeEmployees ? JSON.stringify(ds.includeEmployees) : null,
        excludeEmployees: ds.excludeEmployees ? JSON.stringify(ds.excludeEmployees) : null,
        includeExited: !!ds.includeExited, includeNotice: !!ds.includeNotice,
      })),
    })
  }

  await logPermissionAudit({ action: "RoleCreated", entityType: "Role", entityId: role.id, roleName: role.name, newValue: { name, code, roleType } })
  return created(role)
}
