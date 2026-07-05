import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET() {
  let settings = await db.roleSetting.findUnique({ where: { tenantId: DEFAULT_TENANT_ID } })
  if (!settings) {
    settings = await db.roleSetting.create({ data: { tenantId: DEFAULT_TENANT_ID } })
  }
  return ok(settings)
}

export async function PATCH(req: NextRequest) {
  const body = await parseBody(req)
  let settings = await db.roleSetting.findUnique({ where: { tenantId: DEFAULT_TENANT_ID } })
  if (!settings) {
    settings = await db.roleSetting.create({ data: { tenantId: DEFAULT_TENANT_ID } })
  }
  const allowedFields = [
    "allowCustomRoles", "allowMultipleRolesPerUser", "allowTemporaryRoles", "allowRoleCloning",
    "allowRoleVersioning", "allowRoleApprovalBeforePublish", "allowRoleExpiry",
    "preventSelfPermissionEscalation", "requireReasonForSensitive",
    "defaultPermissionMode", "conflictHandling",
    "allowModuleLevelPermission", "allowPageLevelPermission", "allowActionLevelPermission",
    "allowFieldLevelPermission", "allowRecordLevelPermission",
    "enableFieldMasking", "enableSensitiveFieldRestriction", "enableDocumentFolderPermission",
    "requireMfaForAdmin", "requireMfaForPayroll", "requireMfaForDocumentAdmin",
    "sessionTimeoutMinutes", "loginIpRestriction", "blockConcurrentLogin", "autoRevokeInactiveDays",
  ]
  const updateData: any = {}
  for (const f of allowedFields) {
    if (body[f] !== undefined) updateData[f] = body[f]
  }
  const updated = await db.roleSetting.update({ where: { tenantId: DEFAULT_TENANT_ID }, data: updateData })
  await logPermissionAudit({ action: "SettingsUpdated", entityType: "RoleSetting", entityId: DEFAULT_TENANT_ID, oldValue: settings, newValue: updateData, performedByName: body.performedByName })
  return ok(updated)
}
