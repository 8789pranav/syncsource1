// =====================================================================
// Roles & Permissions — Audit Logger & Seed Helper
// =====================================================================
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"

// ---------------------------------------------------------------
// Audit logger
// ---------------------------------------------------------------
export interface AuditEntry {
  action: string
  entityType?: string
  entityId?: string
  roleName?: string
  oldValue?: any
  newValue?: any
  performedById?: string
  performedByName?: string
  ipAddress?: string
  device?: string
  reason?: string
  status?: "Success" | "Failed"
  roleId?: string
}

export async function logPermissionAudit(entry: AuditEntry) {
  try {
    await db.permissionAuditLog.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        action: entry.action,
        entityType: entry.entityType || null,
        entityId: entry.entityId || null,
        roleName: entry.roleName || null,
        oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
        performedById: entry.performedById || null,
        performedByName: entry.performedByName || "System",
        ipAddress: entry.ipAddress || null,
        device: entry.device || null,
        reason: entry.reason || null,
        status: entry.status || "Success",
        roleId: entry.roleId || null,
      },
    })
  } catch (e) {
    // Audit failures must not break the main operation
    console.error("[audit] logPermissionAudit failed:", e)
  }
}

// ---------------------------------------------------------------
// Seed helper — idempotent seed of default roles + settings
// ---------------------------------------------------------------
export async function seedRolesAndPermissions() {
  const tenantId = DEFAULT_TENANT_ID

  // 1. Ensure settings row exists
  const existingSettings = await db.roleSetting.findUnique({ where: { tenantId } })
  if (!existingSettings) {
    await db.roleSetting.create({ data: { tenantId } })
  }

  // 2. Default system roles + their module permissions
  const SYSTEM_ROLES = [
    {
      name: "Super Admin", code: "SUPER_ADMIN", roleType: "System", isSystem: true, isDefault: false,
      riskLevel: "Critical", description: "Full unrestricted access to all modules",
      modules: { "dashboard": "FullAccess", "organization": "FullAccess", "employees": "FullAccess", "onboarding": "FullAccess", "offboarding": "FullAccess", "leave": "FullAccess", "shift": "FullAccess", "roster": "FullAccess", "attendance": "FullAccess", "holiday": "FullAccess", "payroll": "FullAccess", "documents": "FullAccess", "asset": "FullAccess", "announcements": "FullAccess", "forms": "FullAccess", "workflows": "FullAccess", "roles-permissions": "FullAccess", "audit": "FullAccess", "settings": "FullAccess" },
    },
    {
      name: "HR Admin", code: "HR_ADMIN", roleType: "System", isSystem: true, isDefault: false,
      riskLevel: "High", description: "Full HR management — employees, leave, attendance, documents; no payroll",
      modules: { "dashboard": "FullAccess", "organization": "FullAccess", "employees": "FullAccess", "onboarding": "FullAccess", "offboarding": "FullAccess", "leave": "FullAccess", "shift": "FullAccess", "roster": "FullAccess", "attendance": "FullAccess", "holiday": "FullAccess", "payroll": "NoAccess", "documents": "FullAccess", "asset": "Manage", "announcements": "FullAccess", "forms": "FullAccess", "workflows": "FullAccess", "roles-permissions": "Manage", "audit": "View", "settings": "Manage" },
    },
    {
      name: "Payroll Admin", code: "PAYROLL_ADMIN", roleType: "System", isSystem: true, isDefault: false,
      riskLevel: "Critical", description: "Full payroll access — salary, payslips, compliance, FnF",
      modules: { "dashboard": "View", "organization": "View", "employees": "View", "onboarding": "NoAccess", "offboarding": "View", "leave": "View", "shift": "NoAccess", "roster": "NoAccess", "attendance": "View", "holiday": "View", "payroll": "FullAccess", "documents": "View", "asset": "NoAccess", "announcements": "NoAccess", "forms": "NoAccess", "workflows": "NoAccess", "roles-permissions": "NoAccess", "audit": "View", "settings": "NoAccess" },
    },
    {
      name: "Manager", code: "MANAGER", roleType: "Implicit", isSystem: true, isDefault: false,
      riskLevel: "Medium", description: "Reporting manager — approve team leave/attendance, view team profiles",
      modules: { "dashboard": "View", "organization": "View", "employees": "View", "onboarding": "View", "offboarding": "View", "leave": "Manage", "shift": "View", "roster": "View", "attendance": "Manage", "holiday": "View", "payroll": "NoAccess", "documents": "View", "asset": "View", "announcements": "View", "forms": "NoAccess", "workflows": "NoAccess", "roles-permissions": "NoAccess", "audit": "NoAccess", "settings": "NoAccess" },
    },
    {
      name: "Employee", code: "EMPLOYEE", roleType: "System", isSystem: true, isDefault: true,
      riskLevel: "Low", description: "Default employee role — self-service access",
      modules: { "dashboard": "View", "organization": "NoAccess", "employees": "NoAccess", "onboarding": "NoAccess", "offboarding": "NoAccess", "leave": "View", "shift": "View", "roster": "NoAccess", "attendance": "View", "holiday": "View", "payroll": "NoAccess", "documents": "View", "asset": "View", "announcements": "View", "forms": "NoAccess", "workflows": "NoAccess", "roles-permissions": "NoAccess", "audit": "NoAccess", "settings": "NoAccess" },
    },
    {
      name: "HR Executive", code: "HR_EXECUTIVE", roleType: "Custom", isSystem: false, isDefault: false,
      riskLevel: "Medium", description: "HR operations — manage employees & documents; no payroll/roles",
      modules: { "dashboard": "View", "organization": "View", "employees": "Manage", "onboarding": "Manage", "offboarding": "Manage", "leave": "Manage", "shift": "View", "roster": "View", "attendance": "View", "holiday": "View", "payroll": "NoAccess", "documents": "Manage", "asset": "View", "announcements": "Manage", "forms": "View", "workflows": "View", "roles-permissions": "NoAccess", "audit": "View", "settings": "NoAccess" },
    },
    {
      name: "Recruiter", code: "RECRUITER", roleType: "Functional", isSystem: false, isDefault: false,
      riskLevel: "Medium", description: "Recruitment & onboarding focused",
      modules: { "dashboard": "View", "organization": "View", "employees": "View", "onboarding": "FullAccess", "offboarding": "NoAccess", "leave": "NoAccess", "shift": "NoAccess", "roster": "NoAccess", "attendance": "NoAccess", "holiday": "View", "payroll": "NoAccess", "documents": "Manage", "asset": "NoAccess", "announcements": "View", "forms": "View", "workflows": "View", "roles-permissions": "NoAccess", "audit": "NoAccess", "settings": "NoAccess" },
    },
    {
      name: "Document Admin", code: "DOC_ADMIN", roleType: "Functional", isSystem: false, isDefault: false,
      riskLevel: "Medium", description: "Manage employee & HR documents, templates and letters",
      modules: { "dashboard": "View", "organization": "View", "employees": "View", "onboarding": "View", "offboarding": "View", "leave": "NoAccess", "shift": "NoAccess", "roster": "NoAccess", "attendance": "NoAccess", "holiday": "NoAccess", "payroll": "NoAccess", "documents": "FullAccess", "asset": "NoAccess", "announcements": "View", "forms": "View", "workflows": "NoAccess", "roles-permissions": "NoAccess", "audit": "View", "settings": "NoAccess" },
    },
    {
      name: "Finance Approver", code: "FINANCE_APPROVER", roleType: "Workflow", isSystem: false, isDefault: false,
      riskLevel: "High", description: "Approve payroll, expenses, FnF — finance team",
      modules: { "dashboard": "View", "organization": "View", "employees": "View", "onboarding": "NoAccess", "offboarding": "View", "leave": "NoAccess", "shift": "NoAccess", "roster": "NoAccess", "attendance": "NoAccess", "holiday": "NoAccess", "payroll": "Manage", "documents": "View", "asset": "NoAccess", "announcements": "NoAccess", "forms": "NoAccess", "workflows": "View", "roles-permissions": "NoAccess", "audit": "View", "settings": "NoAccess" },
    },
    {
      name: "IT Admin", code: "IT_ADMIN", roleType: "Functional", isSystem: false, isDefault: false,
      riskLevel: "Medium", description: "Manage assets, system settings & user access",
      modules: { "dashboard": "View", "organization": "Manage", "employees": "View", "onboarding": "View", "offboarding": "View", "leave": "NoAccess", "shift": "NoAccess", "roster": "NoAccess", "attendance": "NoAccess", "holiday": "NoAccess", "payroll": "NoAccess", "documents": "View", "asset": "FullAccess", "announcements": "Manage", "forms": "Manage", "workflows": "Manage", "roles-permissions": "Manage", "audit": "View", "settings": "Manage" },
    },
    {
      name: "Auditor", code: "AUDITOR", roleType: "Custom", isSystem: false, isDefault: false,
      riskLevel: "Medium", description: "Read-only access across all modules for audit purposes",
      modules: { "dashboard": "View", "organization": "View", "employees": "View", "onboarding": "View", "offboarding": "View", "leave": "View", "shift": "View", "roster": "View", "attendance": "View", "holiday": "View", "payroll": "View", "documents": "View", "asset": "View", "announcements": "View", "forms": "View", "workflows": "View", "roles-permissions": "View", "audit": "FullAccess", "settings": "View" },
    },
  ]

  for (const r of SYSTEM_ROLES) {
    const existing = await db.role.findUnique({ where: { tenantId_code: { tenantId, code: r.code } } })
    if (!existing) {
      const role = await db.role.create({
        data: {
          tenantId,
          name: r.name,
          code: r.code,
          roleType: r.roleType,
          isSystem: r.isSystem,
          isDefault: r.isDefault,
          riskLevel: r.riskLevel,
          description: r.description,
          status: "Active",
        },
      })
      // Seed module permissions
      await db.roleModulePermission.createMany({
        data: Object.entries(r.modules).map(([module, accessLevel]) => ({
          tenantId,
          roleId: role.id,
          module,
          accessLevel: accessLevel as string,
          riskLevel: accessLevel === "FullAccess" ? "High" : accessLevel === "Manage" ? "Medium" : "Low",
        })),
      })
    }
  }

  // 3. Default data access rules
  const DEFAULT_RULES = [
    { name: "All Employees", code: "ALL_EMPLOYEES", description: "Access to all employees", scopeType: "All" },
    { name: "Self Only", code: "SELF_ONLY", description: "Access to own record only", scopeType: "Self" },
    { name: "Direct Reports", code: "DIRECT_REPORTS", description: "Access to direct reports", scopeType: "DirectReports" },
    { name: "Same Department", code: "SAME_DEPT", description: "Employees in same department", scopeType: "SameDepartment" },
    { name: "Same Location", code: "SAME_LOC", description: "Employees in same location", scopeType: "SameLocation" },
  ]
  for (const r of DEFAULT_RULES) {
    const ex = await db.dataAccessRule.findUnique({ where: { tenantId_code: { tenantId, code: r.code } } })
    if (!ex) {
      await db.dataAccessRule.create({
        data: { tenantId, name: r.name, code: r.code, description: r.description, status: "Active" },
      })
    }
  }

  // 4. Default approval roles
  const DEFAULT_APPROVAL_ROLES = [
    { name: "Leave Approver L1", code: "LEAVE_APP_L1", module: "leave", approvalType: "Approver", approverType: "ReportingManager", level: 1, mode: "Sequential" },
    { name: "Leave Approver L2", code: "LEAVE_APP_L2", module: "leave", approvalType: "Approver", approverType: "DepartmentHead", level: 2, mode: "Sequential" },
    { name: "Attendance Approver", code: "ATT_APP", module: "attendance", approvalType: "Approver", approverType: "ReportingManager", level: 1, mode: "Sequential" },
    { name: "Payroll Approver L1", code: "PAY_APP_L1", module: "payroll", approvalType: "Approver", approverType: "Role", level: 1, mode: "Sequential" },
    { name: "Payroll Approver L2", code: "PAY_APP_L2", module: "payroll", approvalType: "Approver", approverType: "Role", level: 2, mode: "Sequential" },
    { name: "Onboarding Approver", code: "ONB_APP", module: "onboarding", approvalType: "Approver", approverType: "Role", level: 1, mode: "Sequential" },
    { name: "Offboarding Approver", code: "OFF_APP", module: "offboarding", approvalType: "Approver", approverType: "Role", level: 1, mode: "Sequential" },
    { name: "Document Verifier", code: "DOC_VER", module: "document", approvalType: "Verifier", approverType: "Role", level: 1, mode: "Sequential" },
    { name: "Expense Approver", code: "EXP_APP", module: "expense", approvalType: "Approver", approverType: "ReportingManager", level: 1, mode: "Sequential" },
    { name: "Asset Approver", code: "AST_APP", module: "asset", approvalType: "Approver", approverType: "Role", level: 1, mode: "Sequential" },
  ]
  for (const r of DEFAULT_APPROVAL_ROLES) {
    const ex = await db.approvalRole.findUnique({ where: { tenantId_code: { tenantId, code: r.code } } })
    if (!ex) {
      await db.approvalRole.create({
        data: { tenantId, name: r.name, code: r.code, module: r.module, approvalType: r.approvalType, approverType: r.approverType, level: r.level, mode: r.mode, status: "Active" },
      })
    }
  }

  return { seeded: true, rolesCount: SYSTEM_ROLES.length, rulesCount: DEFAULT_RULES.length, approvalRolesCount: DEFAULT_APPROVAL_ROLES.length }
}
