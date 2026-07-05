import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok } from "@/lib/api-helpers"

export async function GET() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [total30d, criticalActions, failedAttempts, sensitiveViews] = await Promise.all([
    db.permissionAuditLog.count({ where: { tenantId: DEFAULT_TENANT_ID, createdAt: { gte: thirtyDaysAgo } } }),
    db.permissionAuditLog.count({ where: { tenantId: DEFAULT_TENANT_ID, createdAt: { gte: thirtyDaysAgo }, action: { in: ["RoleDeleted", "PermissionChanged", "ExportPerformed", "TemporaryAccessGranted", "SettingsUpdated"] } } }),
    db.permissionAuditLog.count({ where: { tenantId: DEFAULT_TENANT_ID, createdAt: { gte: thirtyDaysAgo }, status: "Failed" } }),
    db.permissionAuditLog.count({ where: { tenantId: DEFAULT_TENANT_ID, createdAt: { gte: thirtyDaysAgo }, action: "SensitiveDataViewed" } }),
  ])

  return ok({ total30d, criticalActions, failedAttempts, sensitiveViews })
}
