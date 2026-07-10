"""
Roles & Permissions routes — roles, approval roles, data access rules,
delegations, access requests, audit logs, settings, matrix, users, seed.
Single Responsibility: manages all roles & permissions endpoints.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Employee
from app.models.extended_models import (
    Role, ApprovalRole, DataAccessRule, Delegation,
    AccessRequest, PermissionAuditLog, RoleEntityConfig, RoleSetting,
    UserRole, RoleModulePermission,
)
from app.api.crud_factory import create_crud_router, _serialize
from typing import Optional
from datetime import datetime
import json

router = APIRouter(prefix="/api", tags=["roles-permissions"])

# Custom routes registered BEFORE CRUD factory to avoid path conflicts.


@router.post("/roles-permissions/access-requests")
async def create_access_request(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    eff_from, eff_to = None, None
    try: eff_from = datetime.fromisoformat(body["effectiveFrom"]) if body.get("effectiveFrom") else None
    except (ValueError, KeyError): pass
    try: eff_to = datetime.fromisoformat(body["effectiveTo"]) if body.get("effectiveTo") else None
    except (ValueError, KeyError): pass
    req = AccessRequest(
        tenant_id=user.tenant_id,
        requested_by_id=body.get("requestedById") or body.get("requested_by_id"),
        user_id=body.get("userId") or body.get("user_id") or body.get("requestedById") or body.get("requested_by_id") or "",
        request_type=body.get("requestType", body.get("request_type", "RoleAccess")),
        requested_role_id=body.get("requestedRoleId") or body.get("requested_role_id"),
        requested_modules=body.get("requestedModules") or body.get("requested_modules"),
        reason=body.get("reason"),
        status=body.get("status", "PendingApproval"),
        effective_from=eff_from, effective_to=eff_to,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return _serialize(req)


@router.post("/roles-permissions/delegations")
async def create_delegation(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    start_dt, end_dt = None, None
    try: start_dt = datetime.fromisoformat(body["startDate"]) if body.get("startDate") else datetime.utcnow()
    except (ValueError, KeyError): start_dt = datetime.utcnow()
    try: end_dt = datetime.fromisoformat(body["endDate"]) if body.get("endDate") else None
    except (ValueError, KeyError): pass
    dele = Delegation(
        tenant_id=user.tenant_id,
        from_employee_id=body.get("fromEmployeeId") or body.get("from_employee_id") or "",
        to_employee_id=body.get("toEmployeeId") or body.get("to_employee_id") or "",
        from_user_id=body.get("fromUserId") or body.get("from_user_id") or "",
        to_user_id=body.get("toUserId") or body.get("to_user_id") or "",
        delegation_type=body.get("delegationType", body.get("delegation_type", "Full")),
        module=body.get("module"),
        start_date=start_dt, end_date=end_dt,
        reason=body.get("reason"),
        status=body.get("status", "Active"),
    )
    db.add(dele)
    await db.commit()
    await db.refresh(dele)
    return _serialize(dele)


@router.get("/roles-permissions/settings")
async def get_rp_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RoleSetting).where(RoleSetting.tenant_id == user.tenant_id, RoleSetting.key == "global")
    )
    row = result.scalars().first()
    defaults = {
        "requireMFAForSensitiveRoles": False, "sessionTimeoutMinutes": 480,
        "maxFailedLoginAttempts": 5, "lockoutDurationMinutes": 30,
        "requireApprovalForRoleAssignment": True, "autoRevokeOnResignation": True,
        "autoRevokeOnTransfer": False, "enableDelegation": True,
        "maxDelegationDays": 30, "requireReasonForAccess": True,
        "enableAccessRequests": True, "accessRequestAutoApprove": False,
        "enablePermissionAudit": True, "auditRetentionDays": 365,
        "allowSelfServiceRoleViewing": True, "showPermissionsToEmployees": False,
        "enableRiskBasedAccess": False, "criticalRoleMFARequired": True,
        "notifyOnRoleAssignment": True, "notifyOnPermissionChange": True,
        "enableEntityLevelPermissions": True, "defaultScopeType": "All",
        "enableDataMasking": False, "enableFieldLevelSecurity": False,
    }
    settings = json.loads(row.value) if row and row.value else defaults
    return {"settings": settings, "defaults": defaults}


@router.patch("/roles-permissions/settings")
async def patch_rp_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(
        select(RoleSetting).where(RoleSetting.tenant_id == user.tenant_id, RoleSetting.key == "global")
    )
    row = result.scalars().first()
    settings_to_save = {k: v for k, v in body.items() if k != "performedByName"}
    if row:
        row.value = json.dumps(settings_to_save)
    else:
        row = RoleSetting(tenant_id=user.tenant_id, role_id="__global__", key="global", value=json.dumps(settings_to_save))
        db.add(row)
    await db.commit()
    return {"settings": settings_to_save, "ok": True}


@router.get("/roles-permissions/users")
async def list_rp_users(
    q: Optional[str] = None,
    has_role: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Employee).where(Employee.tenant_id == user.tenant_id)
    if q:
        stmt = stmt.where(or_(
            Employee.first_name.contains(q),
            Employee.last_name.contains(q),
            Employee.employee_code.contains(q),
        ))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(Employee.first_name).offset((page - 1) * page_size).limit(page_size)
    emp_result = await db.execute(stmt)
    employees = emp_result.scalars().all()
    emp_ids = [e.id for e in employees]

    ur_result = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id.in_(emp_ids))
    )
    ur_by_user: dict = {}
    for ur in ur_result.scalars().all():
        ur_by_user.setdefault(ur.user_id, []).append(_serialize(ur))

    items = []
    for e in employees:
        roles = ur_by_user.get(e.id, [])
        if has_role == "yes" and not roles:
            continue
        if has_role == "no" and roles:
            continue
        d = _serialize(e)
        d["assignedRoles"] = roles
        items.append(d)

    return {"items": items, "total": total, "page": page, "pageSize": page_size}


@router.get("/roles-permissions/me")
async def rp_me(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    all_modules = ["dashboard","organization","employees","onboarding","offboarding","leave","shift","roster","attendance","holiday","payroll","documents","asset","announcements","forms","workflows","roles-permissions","audit","settings"]
    return {
        "userId": user.id,
        "userName": user.name,
        "roleCode": user.role,
        "roleName": user.role,
        "roleType": "System",
        "riskLevel": "Low",
        "allowedModules": all_modules,
        "deniedModules": [],
        "fieldAccess": {},
        "dataScopes": [],
        "conflicts": [],
        "moduleAccess": {},
    }


@router.get("/roles-permissions/dashboard")
async def rp_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    roles_count = (await db.execute(select(func.count()).where(Role.tenant_id == user.tenant_id))).scalar() or 0
    users_count = (await db.execute(select(func.count()).where(UserRole.tenant_id == user.tenant_id))).scalar() or 0
    pending = (await db.execute(select(func.count()).where(AccessRequest.tenant_id == user.tenant_id, AccessRequest.status == "Pending"))).scalar() or 0

    type_result = await db.execute(
        select(Role.is_system, func.count()).where(Role.tenant_id == user.tenant_id).group_by(Role.is_system)
    )
    roles_by_type = [{"type": "System" if r[0] else "Custom", "count": r[1]} for r in type_result.all()]

    risk_distribution: list = []

    top_result = await db.execute(
        select(UserRole.role_id, func.count()).where(UserRole.tenant_id == user.tenant_id).group_by(UserRole.role_id).order_by(func.count().desc()).limit(5)
    )
    top_rows = top_result.all()
    top_role_ids = [r[0] for r in top_rows]
    top_roles_by_users = []
    if top_role_ids:
        roles_result = await db.execute(select(Role).where(Role.id.in_(top_role_ids)))
        roles_map = {r.id: r for r in roles_result.scalars().all()}
        for r in top_rows:
            role = roles_map.get(r[0])
            top_roles_by_users.append({"roleId": r[0], "name": role.name if role else r[0], "userCount": r[1]})

    module_result = await db.execute(
        select(RoleModulePermission.module, func.count()).where(RoleModulePermission.tenant_id == user.tenant_id).group_by(RoleModulePermission.module)
    )
    module_map = {
        "dashboard": ("Dashboard", "Main", "Low"), "organization": ("Organization", "Config", "Medium"),
        "employees": ("Employees", "People", "High"), "onboarding": ("Onboarding", "People", "Medium"),
        "leave": ("Leave", "Time", "Medium"), "attendance": ("Attendance", "Time", "Medium"),
        "payroll": ("Payroll", "Payroll", "Critical"), "documents": ("Documents", "Documents", "Medium"),
        "roles-permissions": ("Roles & Permissions", "Access", "Critical"), "settings": ("Settings", "System", "Medium"),
    }
    module_coverage = []
    for r in module_result.all():
        mod = r[0] or "unknown"
        label, group, risk = module_map.get(mod, (mod, "Other", "Low"))
        module_coverage.append({"module": mod, "label": label, "group": group, "riskLevel": risk, "roleCount": r[1]})

    log_result = await db.execute(
        select(PermissionAuditLog).where(PermissionAuditLog.tenant_id == user.tenant_id).order_by(PermissionAuditLog.created_at.desc()).limit(5)
    )
    recent_changes = [_serialize(l) for l in log_result.scalars().all()]

    return {
        "stats": {
            "totalRoles": roles_count,
            "activeUsers": users_count,
            "pendingRequests": pending,
            "criticalPermissions": 0,
        },
        "rolesByType": roles_by_type,
        "riskDistribution": risk_distribution,
        "topRolesByUsers": top_roles_by_users,
        "moduleCoverage": module_coverage,
        "recentChanges": recent_changes,
    }


@router.get("/roles-permissions/matrix")
async def rp_matrix(
    role_type: Optional[str] = None,
    group: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_stmt = select(Role).where(Role.tenant_id == user.tenant_id, Role.status == "Active")
    if role_type and role_type != "__all__":
        role_stmt = role_stmt.where(Role.role_type == role_type)
    roles_result = await db.execute(role_stmt)
    roles = [{"id": r.id, "name": r.name, "code": r.code, "roleType": r.role_type, "isSystem": r.is_system} for r in roles_result.scalars().all()]
    role_ids = [r["id"] for r in roles]

    module_map = {
        "dashboard": ("Dashboard", "Main", "Low"), "organization": ("Organization", "Config", "Medium"),
        "employees": ("Employees", "People", "High"), "onboarding": ("Onboarding", "People", "Medium"),
        "offboarding": ("Offboarding", "People", "Medium"), "leave": ("Leave", "Time", "Medium"),
        "attendance": ("Attendance", "Time", "Medium"), "payroll": ("Payroll", "Payroll", "Critical"),
        "documents": ("Documents", "Documents", "Medium"), "asset": ("Assets", "Assets", "Medium"),
        "roles-permissions": ("Roles & Permissions", "Access", "Critical"), "settings": ("Settings", "System", "Medium"),
    }
    all_modules = []
    for mod_id, (label, grp, risk) in module_map.items():
        if group and group != "__all__" and grp != group:
            continue
        all_modules.append({"id": mod_id, "label": label, "group": grp, "riskLevel": risk})

    cells = []
    if role_ids:
        perm_result = await db.execute(
            select(RoleModulePermission).where(
                RoleModulePermission.tenant_id == user.tenant_id,
                RoleModulePermission.role_id.in_(role_ids),
            )
        )
        cells = [{"roleId": p.role_id, "module": p.module, "accessLevel": p.access_level} for p in perm_result.scalars().all()]
    return {"modules": all_modules, "roles": roles, "cells": cells}


@router.post("/roles-permissions/matrix/cell")
async def rp_matrix_cell(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    role_id = body.get("roleId", body.get("role_id"))
    module = body.get("module")
    access_level = body.get("accessLevel", body.get("access_level", "NoAccess"))
    existing = await db.execute(
        select(RoleModulePermission).where(
            RoleModulePermission.tenant_id == user.tenant_id,
            RoleModulePermission.role_id == role_id,
            RoleModulePermission.module == module,
        )
    )
    perm = existing.scalars().first()
    if perm:
        perm.access_level = access_level
        perm.can_view = access_level not in ("NoAccess",)
        perm.can_create = access_level in ("Create", "Edit", "Manage", "FullControl")
        perm.can_edit = access_level in ("Edit", "Manage", "FullControl")
        perm.can_delete = access_level in ("Manage", "FullControl")
    else:
        perm = RoleModulePermission(
            tenant_id=user.tenant_id, role_id=role_id, module=module, access_level=access_level,
            can_view=access_level not in ("NoAccess",),
            can_create=access_level in ("Create", "Edit", "Manage", "FullControl"),
            can_edit=access_level in ("Edit", "Manage", "FullControl"),
            can_delete=access_level in ("Manage", "FullControl"),
        )
        db.add(perm)
    await db.commit()
    return {"roleId": role_id, "module": module, "accessLevel": access_level}


@router.post("/roles-permissions/roles/{role_id}/clone")
async def clone_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Role).where(Role.id == role_id, Role.tenant_id == user.tenant_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    new_role = Role(
        tenant_id=user.tenant_id,
        code=f"{role.code}-copy",
        name=f"{role.name} (Copy)",
        description=role.description,
        is_active=True,
    )
    db.add(new_role)
    await db.commit()
    return _serialize(new_role)


@router.get("/roles-permissions/roles/{role_id}/permissions")
async def get_role_permissions(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RoleModulePermission).where(RoleModulePermission.tenant_id == user.tenant_id, RoleModulePermission.role_id == role_id)
    )
    perms = result.scalars().all()
    module_permissions = [{"module": p.module, "accessLevel": p.access_level, "riskLevel": p.risk_level} for p in perms]
    return {
        "modulePermissions": module_permissions,
        "fieldPermissions": [],
        "dataScopes": [],
    }


@router.get("/roles-permissions/roles/compare")
async def compare_roles(
    a: Optional[str] = None,
    b: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_ids = [x for x in [a, b] if x]
    if not role_ids:
        return {"roles": [], "modules": [], "cells": {}}
    roles_result = await db.execute(select(Role).where(Role.id.in_(role_ids), Role.tenant_id == user.tenant_id))
    roles = {r.id: {"id": r.id, "name": r.name, "code": r.code, "roleType": r.role_type} for r in roles_result.scalars().all()}
    perm_result = await db.execute(
        select(RoleModulePermission).where(
            RoleModulePermission.tenant_id == user.tenant_id,
            RoleModulePermission.role_id.in_(role_ids),
        )
    )
    cells: dict = {}
    modules: set = set()
    for p in perm_result.scalars().all():
        modules.add(p.module)
        if p.module not in cells:
            cells[p.module] = {}
        cells[p.module][p.role_id] = p.access_level
    return {"roles": list(roles.values()), "modules": sorted(modules), "cells": cells}


@router.get("/roles-permissions/users/{user_id}/effective")
async def effective_permissions(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ur_result = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id == user_id)
    )
    user_roles = ur_result.scalars().all()
    role_ids = [ur.role_id for ur in user_roles]
    allowed_modules: set = set()
    module_access: dict = {}
    if role_ids:
        perm_result = await db.execute(
            select(RoleModulePermission).where(
                RoleModulePermission.tenant_id == user.tenant_id,
                RoleModulePermission.role_id.in_(role_ids),
            )
        )
        for p in perm_result.scalars().all():
            if p.access_level and p.access_level != "NoAccess":
                allowed_modules.add(p.module)
            if p.module not in module_access or p.access_level > module_access[p.module]:
                module_access[p.module] = p.access_level
    roles_result = await db.execute(select(Role).where(Role.id.in_(role_ids), Role.tenant_id == user.tenant_id))
    roles_list = [{"id": r.id, "name": r.name, "code": r.code, "roleType": r.role_type} for r in roles_result.scalars().all()]
    return {
        "userId": user_id,
        "roles": roles_list,
        "allowedModules": sorted(allowed_modules),
        "moduleAccess": module_access,
        "fieldAccess": {},
        "dataScopes": [],
    }


@router.post("/roles-permissions/users/{user_id}/lock")
async def lock_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.repositories.user_repository import UserRepository
    repo = UserRepository(db)
    target = await repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = not target.is_active
    await db.commit()
    return _serialize(target)


@router.get("/roles-permissions/users/{user_id}/roles")
async def get_user_roles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id == user_id)
    )
    return [_serialize(r) for r in result.scalars().all()]


@router.post("/roles-permissions/users/{user_id}/roles/{role_id}")
async def assign_role(
    user_id: str,
    role_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    existing = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id == user_id, UserRole.role_id == role_id)
    )
    ur = existing.scalars().first()
    if ur:
        ur.scope_type = body.get("scopeType", ur.scope_type)
        ur.is_temporary = body.get("isTemporary", ur.is_temporary)
        ur.reason = body.get("reason", ur.reason)
        if body.get("effectiveFrom"):
            try: ur.effective_from = datetime.fromisoformat(body["effectiveFrom"])
            except ValueError: pass
        if body.get("effectiveTo"):
            try: ur.effective_to = datetime.fromisoformat(body["effectiveTo"])
            except ValueError: pass
        ur.performed_by_name = body.get("performedByName")
    else:
        eff_from, eff_to = None, None
        try: eff_from = datetime.fromisoformat(body["effectiveFrom"]) if body.get("effectiveFrom") else None
        except ValueError: pass
        try: eff_to = datetime.fromisoformat(body["effectiveTo"]) if body.get("effectiveTo") else None
        except ValueError: pass
        ur = UserRole(
            tenant_id=user.tenant_id, user_id=user_id, role_id=role_id,
            scope_type=body.get("scopeType", "All"),
            is_temporary=body.get("isTemporary", False),
            reason=body.get("reason"),
            effective_from=eff_from, effective_to=eff_to,
            performed_by_name=body.get("performedByName"),
        )
        db.add(ur)
    await db.commit()
    return _serialize(ur)


@router.delete("/roles-permissions/users/{user_id}/roles/{role_id}")
async def remove_role(
    user_id: str,
    role_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id == user_id, UserRole.role_id == role_id)
    )
    ur = result.scalar_one_or_none()
    if ur:
        await db.delete(ur)
        await db.commit()
    return {"ok": True}


@router.post("/roles-permissions/access-requests/{req_id}/approve")
async def approve_access_request(
    req_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == req_id, AccessRequest.tenant_id == user.tenant_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
    req.status = "Approved"
    req.approver_comments = body.get("approverComments", "")
    req.approved_by_name = body.get("approvedByName") or user.name or user.id
    req.approved_at = datetime.utcnow()
    await db.commit()
    return _serialize(req)


@router.post("/roles-permissions/access-requests/{req_id}/reject")
async def reject_access_request(
    req_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == req_id, AccessRequest.tenant_id == user.tenant_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
    req.status = "Rejected"
    req.approver_comments = body.get("approverComments", "")
    req.approved_by_name = body.get("approvedByName") or user.name or user.id
    req.approved_at = datetime.utcnow()
    await db.commit()
    return _serialize(req)


@router.post("/roles-permissions/access-requests/{req_id}/revoke")
async def revoke_access_request(
    req_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == req_id, AccessRequest.tenant_id == user.tenant_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
    req.status = "Revoked"
    req.approver_comments = body.get("approverComments", "")
    req.approved_at = datetime.utcnow()
    await db.commit()
    return _serialize(req)


@router.post("/roles-permissions/delegations/{del_id}/revoke")
async def revoke_delegation(
    del_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(select(Delegation).where(Delegation.id == del_id, Delegation.tenant_id == user.tenant_id))
    dele = result.scalar_one_or_none()
    if not dele:
        raise HTTPException(status_code=404, detail="Delegation not found")
    dele.status = "Revoked"
    dele.revoked_at = datetime.utcnow()
    dele.revoked_by = body.get("performedByName") or user.name or user.id
    await db.commit()
    return _serialize(dele)


@router.get("/roles-permissions/data-access-rules/{rule_id}/preview")
async def preview_data_access(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(DataAccessRule).where(DataAccessRule.id == rule_id, DataAccessRule.tenant_id == user.tenant_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Data access rule not found")
    return _serialize(rule)


@router.get("/roles-permissions/logs/stats")
async def log_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count()).where(PermissionAuditLog.tenant_id == user.tenant_id))).scalar() or 0
    success = (await db.execute(select(func.count()).where(PermissionAuditLog.tenant_id == user.tenant_id, PermissionAuditLog.status == "Success"))).scalar() or 0
    failed = (await db.execute(select(func.count()).where(PermissionAuditLog.tenant_id == user.tenant_id, PermissionAuditLog.status == "Failed"))).scalar() or 0
    action_result = await db.execute(
        select(PermissionAuditLog.action, func.count())
        .where(PermissionAuditLog.tenant_id == user.tenant_id)
        .group_by(PermissionAuditLog.action)
        .order_by(func.count().desc()).limit(10)
    )
    by_action = [{"action": r[0], "count": r[1]} for r in action_result.all()]
    return {"total": total, "success": success, "failed": failed, "byAction": by_action}


@router.post("/roles-permissions/seed")
async def rp_seed(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Roles & permissions seed data created"}


# CRUD factory routers (registered AFTER custom routes)
router.include_router(create_crud_router(Role, "/roles-permissions/roles", "rp-roles", ["code", "name"], ["role_type", "status", "risk_level", "entity_scope"]))
router.include_router(create_crud_router(ApprovalRole, "/roles-permissions/approval-roles", "rp-approval-roles", ["code", "name"], ["module", "status"]))
router.include_router(create_crud_router(DataAccessRule, "/roles-permissions/data-access-rules", "rp-data-access", ["name", "code", "entity"], ["status"]))
router.include_router(create_crud_router(Delegation, "/roles-permissions/delegations", "rp-delegations", ["from_employee_id", "to_employee_id"], ["delegation_type", "status"]))
router.include_router(create_crud_router(AccessRequest, "/roles-permissions/access-requests", "rp-access-requests", ["requested_by_id"], ["status", "request_type"]))
router.include_router(create_crud_router(PermissionAuditLog, "/roles-permissions/logs", "rp-logs", ["user_name", "performed_by_name"], ["action", "status"]))
router.include_router(create_crud_router(RoleEntityConfig, "/roles-permissions/entity-configs", "rp-entity-configs"))
