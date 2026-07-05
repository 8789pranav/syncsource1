import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, bad, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const source = await db.role.findUnique({
    where: { id },
    include: { modulePermissions: true, pagePermissions: true, actionPermissions: true, fieldPermissions: true, dataScopes: true },
  })
  if (!source) return notFound("Source role not found")
  const body = await parseBody(req)
  const newName = body.name || `${source.name} (Copy)`
  const newCode = body.code || `${source.code}_COPY_${Date.now().toString(36)}`

  const existing = await db.role.findUnique({ where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: newCode } } })
  if (existing) return bad("Role with this code already exists", 409)

  const cloned = await db.role.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: newName, code: newCode,
      description: source.description,
      roleType: "Custom", // cloned roles are always custom
      riskLevel: source.riskLevel,
      status: "Active", isDefault: false, isSystem: false,
      entityScope: source.entityScope,
    },
  })

  if (source.modulePermissions.length) {
    await db.roleModulePermission.createMany({
      data: source.modulePermissions.map(mp => ({ tenantId: DEFAULT_TENANT_ID, roleId: cloned.id, module: mp.module, accessLevel: mp.accessLevel, riskLevel: mp.riskLevel })),
    })
  }
  if (source.pagePermissions.length) {
    await db.rolePagePermission.createMany({
      data: source.pagePermissions.map(pp => ({ tenantId: DEFAULT_TENANT_ID, roleId: cloned.id, module: pp.module, page: pp.page, canView: pp.canView, canCreate: pp.canCreate, canEdit: pp.canEdit, canDelete: pp.canDelete, canApprove: pp.canApprove, canExport: pp.canExport, canImport: pp.canImport, canDownload: pp.canDownload, canUpload: pp.canUpload })),
    })
  }
  if (source.actionPermissions.length) {
    await db.roleActionPermission.createMany({
      data: source.actionPermissions.map(ap => ({ tenantId: DEFAULT_TENANT_ID, roleId: cloned.id, module: ap.module, action: ap.action, allowed: ap.allowed, riskLevel: ap.riskLevel })),
    })
  }
  if (source.fieldPermissions.length) {
    await db.roleFieldPermission.createMany({
      data: source.fieldPermissions.map(fp => ({ tenantId: DEFAULT_TENANT_ID, roleId: cloned.id, module: fp.module, field: fp.field, access: fp.access, riskLevel: fp.riskLevel })),
    })
  }
  if (source.dataScopes.length) {
    await db.roleDataScope.createMany({
      data: source.dataScopes.map(ds => ({ tenantId: DEFAULT_TENANT_ID, roleId: cloned.id, ruleId: ds.ruleId, scopeType: ds.scopeType, entityId: ds.entityId, branchIds: ds.branchIds, locationIds: ds.locationIds, departmentIds: ds.departmentIds, gradeIds: ds.gradeIds, employeeTypeIds: ds.employeeTypeIds, includeEmployees: ds.includeEmployees, excludeEmployees: ds.excludeEmployees, includeExited: ds.includeExited, includeNotice: ds.includeNotice })),
    })
  }

  await logPermissionAudit({ action: "RoleCloned", entityType: "Role", entityId: cloned.id, roleName: cloned.name, oldValue: { sourceId: id, sourceName: source.name } })
  return ok(cloned)
}
