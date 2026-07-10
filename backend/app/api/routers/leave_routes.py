"""
Leave routes — types, policies, adjustments, encashments, balance, ledger,
calendar, dashboard, reports, bulk, clubbing, sandwich, weekly-off, comp-off, settings.
Single Responsibility: manages all leave-related endpoints.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, LeaveType, LeaveApplication, LeaveBalance,
    WeeklyOffCalendar, CompOffCredit, Entity,
)
from app.models.extended_models import (
    LeavePolicy, LeaveAdjustment, LeaveEncashment, LeaveSetting,
)
from app.api.crud_factory import create_crud_router, _serialize, _camel_to_snake
from app.api.routers.leave_applications import router as leave_apps_router
from typing import Optional
from datetime import datetime
import json

router = APIRouter(prefix="/api", tags=["leave"])

# --- Leave applications (delegated to dedicated module) ---
router.include_router(leave_apps_router)

# --- CRUD factory registrations ---
router.include_router(create_crud_router(LeaveType, "/leave-types", "leave-types", ["code", "name"]))
router.include_router(create_crud_router(LeavePolicy, "/leave-policies", "leave-policies", ["code", "name"]))
router.include_router(create_crud_router(LeaveAdjustment, "/leave-adjustments", "leave-adjustments", ["employee_id"]))
router.include_router(create_crud_router(LeaveEncashment, "/leave-encashments", "leave-encashments", ["employee_id"]))


# --- Leave balance ---
@router.get("/leave-balance")
async def leave_balance(
    employee_id: Optional[str] = None,
    leave_type_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(LeaveBalance).where(LeaveBalance.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(LeaveBalance.employee_id == employee_id)
    if leave_type_id:
        stmt = stmt.where(LeaveBalance.leave_type_id == leave_type_id)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    serialized = []
    for r in rows:
        s = _serialize(r)
        s["available"] = (
            (s.get("opening") or 0) + (s.get("accrued") or 0)
            + (s.get("carryForward") or 0) + (s.get("granted") or 0)
            - (s.get("used") or 0) - (s.get("pending") or 0)
        )
        serialized.append(s)
    return serialized


@router.post("/leave-balance")
async def adjust_leave_balance(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    employee_id = body.get("employeeId") or body.get("employee_id")
    leave_type_id = body.get("leaveTypeId") or body.get("leave_type_id")
    amount = body.get("amount", 0)
    action = body.get("action", "grant")
    result = await db.execute(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.leave_type_id == leave_type_id,
            LeaveBalance.tenant_id == user.tenant_id,
        )
    )
    balance = result.scalars().first()
    if not balance:
        balance = LeaveBalance(
            tenant_id=user.tenant_id, employee_id=employee_id,
            leave_type_id=leave_type_id, opening=0, accrued=0,
            carry_forward=0, granted=0, used=0, pending=0,
        )
        db.add(balance)
    if action == "grant":
        balance.granted = (balance.granted or 0) + amount
    elif action == "revoke":
        balance.granted = max(0, (balance.granted or 0) - amount)
    elif action == "use":
        balance.used = (balance.used or 0) + amount
    elif action == "unuse":
        balance.used = max(0, (balance.used or 0) - amount)
    await db.commit()
    await db.refresh(balance)
    return _serialize(balance)


# --- Leave ledger ---
@router.get("/leave-ledger")
async def leave_ledger(
    employee_id: Optional[str] = None,
    leave_type_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(LeaveApplication).where(LeaveApplication.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(LeaveApplication.employee_id == employee_id)
    if leave_type_id:
        stmt = stmt.where(LeaveApplication.leave_type_id == leave_type_id)
    if from_date:
        try:
            fd = datetime.fromisoformat(from_date.replace("Z", "+00:00").replace("+00:00", ""))
            stmt = stmt.where(LeaveApplication.applied_at >= fd)
        except ValueError:
            pass
    if to_date:
        try:
            td = datetime.fromisoformat(to_date.replace("Z", "+00:00").replace("+00:00", ""))
            stmt = stmt.where(LeaveApplication.applied_at <= td)
        except ValueError:
            pass
    stmt = stmt.order_by(LeaveApplication.applied_at.desc()).limit(500)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


# --- Leave calendar ---
@router.get("/leave-calendar")
async def leave_calendar(
    month: Optional[str] = None,
    department_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    year, mo = (map(int, month.split("-")) if month else (now.year, now.month))
    from datetime import timedelta
    month_start = datetime(year, mo, 1)
    month_end = datetime(year + (1 if mo == 12 else 0), (mo % 12) + 1, 1) - timedelta(seconds=1)

    app_stmt = select(LeaveApplication).where(
        LeaveApplication.tenant_id == user.tenant_id,
        LeaveApplication.status.in_(["Approved", "AutoApproved"]),
        or_(LeaveApplication.from_date <= month_end, LeaveApplication.to_date >= month_start),
    )
    app_result = await db.execute(app_stmt)
    days = {}
    for a in app_result.scalars().all():
        d = a.from_date
        while d <= a.to_date and d <= month_end:
            if d >= month_start:
                days.setdefault(d.day, []).append({"id": a.id, "employeeId": a.employee_id, "status": a.status})
            d = d + timedelta(days=1)

    h_stmt = select(Entity).where(Entity.tenant_id == user.tenant_id)
    h_result = await db.execute(h_stmt)
    holidays = [_serialize(h) for h in h_result.scalars().all()]

    w_stmt = select(WeeklyOffCalendar).where(WeeklyOffCalendar.tenant_id == user.tenant_id)
    w_result = await db.execute(w_stmt)
    weekly_offs = [_serialize(w) for w in w_result.scalars().all()]

    return {"days": days, "holidays": holidays, "weeklyOffs": weekly_offs}


# --- Leave dashboard ---
@router.get("/leave-dashboard")
async def leave_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    all_apps_result = await db.execute(
        select(LeaveApplication).where(LeaveApplication.tenant_id == user.tenant_id)
    )
    all_apps = all_apps_result.scalars().all()

    on_leave_today = [
        _serialize(a) for a in all_apps
        if a.status in ("Approved", "AutoApproved")
        and a.from_date <= datetime.utcnow()
        and a.to_date >= datetime.utcnow()
    ]
    pending_requests = [_serialize(a) for a in all_apps if a.status == "Pending"]
    approved_this_month = [
        _serialize(a) for a in all_apps
        if a.status in ("Approved", "AutoApproved") and a.applied_at >= datetime.utcnow().replace(day=1)
    ]
    rejected_this_month = [
        _serialize(a) for a in all_apps
        if a.status == "Rejected" and a.applied_at >= datetime.utcnow().replace(day=1)
    ]
    upcoming_leaves = [
        _serialize(a) for a in all_apps
        if a.status in ("Approved", "AutoApproved")
        and a.from_date >= datetime.utcnow()
        and a.from_date <= datetime.utcnow() + timedelta(days=7)
    ]

    balance_result = await db.execute(
        select(LeaveBalance).where(LeaveBalance.tenant_id == user.tenant_id)
    )
    balances = balance_result.scalars().all()
    balance_alerts = [
        _serialize(b) for b in balances
        if ((b.opening or 0) + (b.accrued or 0) + (b.carry_forward or 0) + (b.granted or 0)
            - (b.used or 0) - (b.pending or 0)) < 2
    ]
    negative_balance = [
        _serialize(b) for b in balances
        if ((b.opening or 0) + (b.accrued or 0) + (b.carry_forward or 0) + (b.granted or 0)
            - (b.used or 0) - (b.pending or 0)) < 0
    ]

    ageing = {"0-3": 0, "4-7": 0, "8-15": 0, "15+": 0}
    for a in pending_requests:
        days = (datetime.utcnow() - a.applied_at).days if a.applied_at else 0
        if days <= 3: ageing["0-3"] += 1
        elif days <= 7: ageing["4-7"] += 1
        elif days <= 15: ageing["8-15"] += 1
        else: ageing["15+"] += 1

    return {
        "onLeaveToday": on_leave_today,
        "pendingApprovals": pending_requests,
        "approvedThisMonth": approved_this_month,
        "rejectedThisMonth": rejected_this_month,
        "upcomingLeaves": upcoming_leaves,
        "balanceAlerts": balance_alerts,
        "negativeBalance": negative_balance,
        "pendingApprovalsAgeing": ageing,
    }


# --- Leave reports ---
@router.get("/leave-reports")
async def leave_reports(
    type: Optional[str] = "requests",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if type in ("requests",):
        stmt = select(LeaveApplication).where(LeaveApplication.tenant_id == user.tenant_id)
        if from_date:
            try: stmt = stmt.where(LeaveApplication.applied_at >= datetime.fromisoformat(from_date))
            except ValueError: pass
        if to_date:
            try: stmt = stmt.where(LeaveApplication.applied_at <= datetime.fromisoformat(to_date))
            except ValueError: pass
        stmt = stmt.order_by(LeaveApplication.applied_at.desc()).limit(1000)
        result = await db.execute(stmt)
        return [_serialize(r) for r in result.scalars().all()]
    elif type in ("ledger",):
        stmt = select(LeaveApplication).where(LeaveApplication.tenant_id == user.tenant_id)
        if from_date:
            try: stmt = stmt.where(LeaveApplication.from_date >= datetime.fromisoformat(from_date))
            except ValueError: pass
        if to_date:
            try: stmt = stmt.where(LeaveApplication.to_date <= datetime.fromisoformat(to_date))
            except ValueError: pass
        stmt = stmt.order_by(LeaveApplication.applied_at.desc()).limit(1000)
        result = await db.execute(stmt)
        return [_serialize(r) for r in result.scalars().all()]
    elif type in ("encashment",):
        stmt = select(LeaveEncashment).where(LeaveEncashment.tenant_id == user.tenant_id)
        result = await db.execute(stmt)
        return [_serialize(r) for r in result.scalars().all()]
    elif type in ("carryforward",):
        return []
    return []


# --- Leave bulk ---
@router.post("/leave-bulk")
async def leave_bulk(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    action = body.get("action", "apply")
    applications = body.get("applications", [])
    created = []
    for app_data in applications:
        app_data["tenant_id"] = user.tenant_id
        valid_cols = {c.name for c in LeaveApplication.__table__.columns}
        clean = {}
        for k, v in app_data.items():
            snake_key = _camel_to_snake(k)
            if snake_key in valid_cols:
                clean[snake_key] = v
        app = LeaveApplication(**clean)
        db.add(app)
        created.append(app)
    await db.commit()
    for a in created:
        await db.refresh(a)
    return [_serialize(a) for a in created]


@router.get("/leave-clubbing")
async def leave_clubbing(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Leave clubbing check endpoint"}


@router.get("/leave-sandwich")
async def leave_sandwich(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Leave sandwich rule check endpoint"}


@router.post("/leave-policies/{policy_id}/recalculate")
async def recalculate_leave_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"ok": True, "message": "Recalculation queued"}


# --- Weekly-off ---
@router.get("/weekly-off")
async def list_weekly_off(
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(WeeklyOffCalendar).where(WeeklyOffCalendar.tenant_id == user.tenant_id)
    if q:
        stmt = stmt.where(or_(WeeklyOffCalendar.name.contains(q), WeeklyOffCalendar.code.contains(q)))
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


@router.post("/weekly-off")
async def create_weekly_off(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenant_id"] = user.tenant_id
    valid_cols = {c.name for c in WeeklyOffCalendar.__table__.columns}
    clean = {}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols:
            clean[snake_key] = v
    obj = WeeklyOffCalendar(**clean)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.patch("/weekly-off/{woc_id}")
async def update_weekly_off(
    woc_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(WeeklyOffCalendar).where(WeeklyOffCalendar.id == woc_id, WeeklyOffCalendar.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Weekly off not found")
    body = await request.json()
    valid_cols = {c.name for c in WeeklyOffCalendar.__table__.columns}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols and snake_key not in ("id", "tenant_id"):
            setattr(obj, snake_key, v)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.delete("/weekly-off/{woc_id}")
async def delete_weekly_off(
    woc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(WeeklyOffCalendar).where(WeeklyOffCalendar.id == woc_id, WeeklyOffCalendar.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Weekly off not found")
    await db.delete(obj)
    await db.commit()
    return {"ok": True}


# --- Comp-off ---
@router.get("/comp-off")
async def list_comp_off(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(CompOffCredit).where(CompOffCredit.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(CompOffCredit.employee_id == employee_id)
    if status:
        stmt = stmt.where(CompOffCredit.status == status)
    stmt = stmt.order_by(CompOffCredit.created_at.desc())
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


@router.post("/comp-off")
async def create_comp_off(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenant_id"] = user.tenant_id
    valid_cols = {c.name for c in CompOffCredit.__table__.columns}
    clean = {}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols:
            clean[snake_key] = v
    obj = CompOffCredit(**clean)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.patch("/comp-off/{co_id}")
async def update_comp_off(
    co_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(CompOffCredit).where(CompOffCredit.id == co_id, CompOffCredit.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Comp-off not found")
    body = await request.json()
    valid_cols = {c.name for c in CompOffCredit.__table__.columns}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols and snake_key not in ("id", "tenant_id"):
            setattr(obj, snake_key, v)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.delete("/comp-off/{co_id}")
async def delete_comp_off(
    co_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(CompOffCredit).where(CompOffCredit.id == co_id, CompOffCredit.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Comp-off not found")
    await db.delete(obj)
    await db.commit()
    return {"ok": True}


# --- Leave settings ---
_LEAVE_SETTINGS_DEFAULTS = {
    "allowHalfDayLeave": True, "allowNegativeBalance": False,
    "carryForwardLimit": 10, "encashmentEnabled": True,
    "sandwichLeaveRule": False, "clubbingLeaveRule": True,
    "probationLeaveQuota": 2, "noticePeriodLeaveQuota": 0,
    "autoApproveOnManagerLeave": False, "notifyManagerOnApply": True,
}

@router.get("/leave-settings")
async def get_leave_settings(
    entity_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import json as _json
    scope_id = entity_id or "__default__"
    def_stmt = select(LeaveSetting).where(
        LeaveSetting.tenant_id == user.tenant_id,
        LeaveSetting.category == "global",
        LeaveSetting.key == "__default__",
    )
    def_result = await db.execute(def_stmt)
    def_row = def_result.scalars().first()
    default_settings = _json.loads(def_row.value) if def_row and def_row.value else _LEAVE_SETTINGS_DEFAULTS.copy()

    if scope_id == "__default__":
        return {
            "scope": "default", "entityId": "__default__", "entity": None,
            "isDefault": True, "settings": default_settings,
            "defaultSettings": _LEAVE_SETTINGS_DEFAULTS,
            "hasOverride": False, "updatedAt": None, "updatedBy": None,
        }

    ov_stmt = select(LeaveSetting).where(
        LeaveSetting.tenant_id == user.tenant_id,
        LeaveSetting.category == "entity",
        LeaveSetting.key == scope_id,
    )
    ov_result = await db.execute(ov_stmt)
    ov_row = ov_result.scalars().first()
    override = _json.loads(ov_row.value) if ov_row and ov_row.value else None
    merged = {**default_settings, **(override or {})}
    ent_result = await db.execute(select(Entity).where(Entity.id == scope_id, Entity.tenant_id == user.tenant_id))
    ent = ent_result.scalars().first()
    return {
        "scope": "entity", "entityId": scope_id, "entity": _serialize(ent) if ent else None,
        "isDefault": False, "settings": merged, "defaultSettings": default_settings,
        "hasOverride": override is not None,
        "updatedAt": ov_row.updated_at.isoformat() if ov_row and hasattr(ov_row, 'updated_at') and ov_row.updated_at else None,
        "updatedBy": None,
    }


@router.put("/leave-settings")
async def put_leave_settings(
    request: Request,
    entity_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import json as _json
    scope_id = entity_id or "__default__"
    body = await request.json()
    settings = body.get("settings", {})
    category = "global" if scope_id == "__default__" else "entity"
    stmt = select(LeaveSetting).where(
        LeaveSetting.tenant_id == user.tenant_id,
        LeaveSetting.category == category,
        LeaveSetting.key == scope_id,
    )
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row:
        row.value = _json.dumps(settings)
    else:
        row = LeaveSetting(tenant_id=user.tenant_id, category=category, key=scope_id, value=_json.dumps(settings))
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return await get_leave_settings(entity_id=entity_id, db=db, user=user)


@router.delete("/leave-settings")
async def delete_leave_settings_override(
    entity_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    scope_id = entity_id or "__default__"
    if scope_id == "__default__":
        raise HTTPException(status_code=400, detail="Cannot delete default settings")
    result = await db.execute(select(LeaveSetting).where(
        LeaveSetting.tenant_id == user.tenant_id,
        LeaveSetting.category == "entity",
        LeaveSetting.key == scope_id,
    ))
    row = result.scalars().first()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True, "deleted": row is not None}
