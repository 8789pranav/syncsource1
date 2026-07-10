"""
Attendance routes — rules, locks, attendance CRUD, requests, overtime,
bulk, dashboard, raw logs, settings.
Single Responsibility: manages all attendance-related endpoints.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, Integer
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Attendance, Employee, Entity
from app.models.extended_models import (
    AttendanceRule, AttendanceLock, AttendanceRequest,
    AttendanceOvertime, AttendanceBulkUpdate, AttendanceRawLog, AttendanceSetting,
)
from app.api.crud_factory import create_crud_router, _serialize, _camel_to_snake
from typing import Optional
from datetime import datetime, timedelta
import re, json

router = APIRouter(prefix="/api", tags=["attendance"])

# --- CRUD factory ---
router.include_router(create_crud_router(AttendanceRule, "/attendance-rules", "attendance-rules", ["code", "name"]))
router.include_router(create_crud_router(AttendanceLock, "/attendance-locks", "attendance-locks"))


# --- Attendance CRUD ---
@router.get("/attendance")
async def list_attendance(
    employee_id: Optional[str] = None,
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Attendance).where(Attendance.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(Attendance.employee_id == employee_id)
    if status:
        stmt = stmt.where(Attendance.status == status)
    if source:
        stmt = stmt.where(Attendance.source == source)
    if from_:
        try:
            stmt = stmt.where(Attendance.date >= datetime.fromisoformat(from_.replace("Z", "+00:00").replace("+00:00", "")))
        except ValueError:
            pass
    if to:
        try:
            stmt = stmt.where(Attendance.date <= datetime.fromisoformat(to.replace("Z", "+00:00").replace("+00:00", "")))
        except ValueError:
            pass
    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0
    stmt = stmt.order_by(Attendance.date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = [_serialize(r) for r in result.scalars().all()]
    return {"items": items, "total": total, "page": page, "pageSize": page_size}


@router.post("/attendance")
async def create_attendance(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenant_id"] = user.tenant_id
    allowed = {c.key for c in Attendance.__table__.columns} - {"id"}
    obj = Attendance(**{k: v for k, v in body.items() if k in allowed})
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.get("/attendance/{att_id}")
async def get_attendance(
    att_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Attendance).where(Attendance.id == att_id, Attendance.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return _serialize(obj)


@router.patch("/attendance/{att_id}")
async def update_attendance(
    att_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(select(Attendance).where(Attendance.id == att_id, Attendance.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    allowed = {c.key for c in Attendance.__table__.columns} - {"id", "tenant_id"}
    for k, v in body.items():
        snake = re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
        col = snake if snake in allowed else (k if k in allowed else None)
        if col:
            setattr(obj, col, v)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.delete("/attendance/{att_id}")
async def delete_attendance(
    att_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Attendance).where(Attendance.id == att_id, Attendance.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()
    return {"ok": True}


# --- Attendance requests ---
@router.get("/attendance-requests")
async def list_attendance_requests(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AttendanceRequest).where(AttendanceRequest.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(AttendanceRequest.employee_id == employee_id)
    if status and status != "all":
        stmt = stmt.where(AttendanceRequest.status == status)
    if type and type != "all":
        stmt = stmt.where(AttendanceRequest.request_type == type)
    if from_:
        try: stmt = stmt.where(AttendanceRequest.applied_at >= datetime.fromisoformat(from_))
        except ValueError: pass
    if to:
        try: stmt = stmt.where(AttendanceRequest.applied_at <= datetime.fromisoformat(to + "T23:59:59"))
        except ValueError: pass
    stmt = stmt.order_by(AttendanceRequest.applied_at.desc()).limit(500)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


@router.post("/attendance-requests")
async def create_attendance_request(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenant_id"] = user.tenant_id
    allowed = {c.key for c in AttendanceRequest.__table__.columns} - {"id"}
    def to_snake(k): return re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
    mapped = {}
    for k, v in body.items():
        col = k if k in allowed else to_snake(k)
        if col in allowed:
            mapped[col] = v
    obj = AttendanceRequest(**mapped)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.get("/attendance-requests/{req_id}")
async def get_attendance_request(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AttendanceRequest).where(AttendanceRequest.id == req_id, AttendanceRequest.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return _serialize(obj)


@router.patch("/attendance-requests/{req_id}")
async def update_attendance_request(
    req_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(select(AttendanceRequest).where(AttendanceRequest.id == req_id, AttendanceRequest.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    action = body.get("action", "").lower()
    comment = body.get("comment") or body.get("decisionComment") or ""
    now = datetime.utcnow()
    if action == "approve":
        obj.status = "Approved"
        obj.decision_comment = comment
        obj.decision_at = now
        obj.decision_by = body.get("approverName") or user.name or user.id
    elif action == "reject":
        obj.status = "Rejected"
        obj.decision_comment = comment
        obj.decision_at = now
        obj.decision_by = body.get("approverName") or user.name or user.id
    elif action in ("cancel", "withdraw"):
        obj.status = "Cancelled" if action == "cancel" else "Withdrawn"
        obj.decision_comment = comment
        obj.decision_at = now
    else:
        allowed = {c.key for c in AttendanceRequest.__table__.columns} - {"id", "tenant_id"}
        def to_snake(k): return re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
        for k, v in body.items():
            col = k if k in allowed else to_snake(k)
            if col in allowed:
                setattr(obj, col, v)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.delete("/attendance-requests/{req_id}")
async def delete_attendance_request(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AttendanceRequest).where(AttendanceRequest.id == req_id, AttendanceRequest.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()
    return {"ok": True}


# --- Attendance overtime ---
@router.get("/attendance-overtime")
async def list_overtime(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    overtime_type: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AttendanceOvertime).where(AttendanceOvertime.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(AttendanceOvertime.employee_id == employee_id)
    if status and status != "all":
        stmt = stmt.where(AttendanceOvertime.status == status)
    if overtime_type and overtime_type != "all":
        stmt = stmt.where(AttendanceOvertime.overtime_type == overtime_type)
    if from_:
        try: stmt = stmt.where(AttendanceOvertime.date >= datetime.fromisoformat(from_))
        except ValueError: pass
    if to:
        try: stmt = stmt.where(AttendanceOvertime.date <= datetime.fromisoformat(to + "T23:59:59"))
        except ValueError: pass
    stmt = stmt.order_by(AttendanceOvertime.date.desc()).limit(500)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


@router.post("/attendance-overtime")
async def create_overtime(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenant_id"] = user.tenant_id
    allowed = {c.key for c in AttendanceOvertime.__table__.columns} - {"id"}
    def to_snake(k): return re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
    mapped = {}
    for k, v in body.items():
        col = k if k in allowed else to_snake(k)
        if col in allowed:
            mapped[col] = v
    obj = AttendanceOvertime(**mapped)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.get("/attendance-overtime/{ot_id}")
async def get_overtime(
    ot_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AttendanceOvertime).where(AttendanceOvertime.id == ot_id, AttendanceOvertime.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return _serialize(obj)


@router.patch("/attendance-overtime/{ot_id}")
async def update_overtime(
    ot_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(select(AttendanceOvertime).where(AttendanceOvertime.id == ot_id, AttendanceOvertime.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    allowed = {c.key for c in AttendanceOvertime.__table__.columns} - {"id", "tenant_id"}
    def to_snake(k): return re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
    for k, v in body.items():
        col = k if k in allowed else to_snake(k)
        if col in allowed:
            setattr(obj, col, v)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


@router.delete("/attendance-overtime/{ot_id}")
async def delete_overtime(
    ot_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AttendanceOvertime).where(AttendanceOvertime.id == ot_id, AttendanceOvertime.tenant_id == user.tenant_id))
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()
    return {"ok": True}


# --- Attendance bulk ---
@router.get("/attendance-bulk")
async def get_attendance_bulk_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AttendanceBulkUpdate).where(AttendanceBulkUpdate.tenant_id == user.tenant_id).order_by(AttendanceBulkUpdate.created_at.desc()).limit(100)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


@router.post("/attendance-bulk")
async def post_attendance_bulk(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import json as _json
    body = await request.json()
    action_type = body.get("actionType", body.get("action", "MarkPresent"))
    from_date_str = body.get("fromDate", body.get("from_date", ""))
    to_date_str = body.get("toDate", body.get("to_date", ""))
    emp_ids = body.get("employeeIds", body.get("employee_ids", []))
    new_status = body.get("newStatus", body.get("new_status"))
    reason = body.get("reason", "")
    now = datetime.utcnow()
    try:
        from_dt = datetime.fromisoformat(from_date_str) if from_date_str else now.replace(day=1)
        to_dt = datetime.fromisoformat(to_date_str) if to_date_str else now
    except ValueError:
        from_dt, to_dt = now.replace(day=1), now

    record = AttendanceBulkUpdate(
        tenant_id=user.tenant_id,
        requested_by=user.name or user.id,
        action_type=action_type,
        from_date=from_dt,
        to_date=to_dt,
        employee_ids=_json.dumps(emp_ids) if emp_ids else None,
        new_status=new_status,
        reason=reason,
        status="Processing",
    )
    db.add(record)
    await db.flush()

    updated = 0
    if action_type.startswith("Mark") and new_status:
        stmt = select(Attendance).where(
            Attendance.tenant_id == user.tenant_id,
            Attendance.date >= from_dt,
            Attendance.date <= to_dt,
        )
        if emp_ids:
            stmt = stmt.where(Attendance.employee_id.in_(emp_ids))
        result = await db.execute(stmt)
        for att in result.scalars().all():
            att.status = new_status
            att.source = "AdminEntry"
            att.remarks = reason
            updated += 1
    record.affected_count = updated
    record.status = "Completed"
    record.processed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(record)
    return {"ok": True, "updated": updated, "bulkUpdateId": record.id}


# --- Attendance dashboard ---
@router.get("/attendance-dashboard")
async def attendance_dashboard(
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    target_date = now
    if date:
        try: target_date = datetime.fromisoformat(date)
        except ValueError: pass
    day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    month_start = day_start.replace(day=1)
    week_start = day_start - timedelta(days=day_start.weekday())
    week_end = week_start + timedelta(days=7)

    day_result = await db.execute(
        select(Attendance).where(
            Attendance.tenant_id == user.tenant_id,
            Attendance.date >= day_start,
            Attendance.date < day_end,
        )
    )
    day_records = day_result.scalars().all()

    def count_status(records, *statuses):
        return sum(1 for r in records if r.status in statuses)

    emp_count = (await db.execute(select(func.count()).where(
        Employee.tenant_id == user.tenant_id, Employee.employee_status == "Active"
    ))).scalar() or 0

    pending_req = (await db.execute(select(func.count()).where(
        AttendanceRequest.tenant_id == user.tenant_id, AttendanceRequest.status == "PendingApproval"
    ))).scalar() or 0

    pending_ot = (await db.execute(select(func.count()).where(
        AttendanceOvertime.tenant_id == user.tenant_id, AttendanceOvertime.status == "Pending"
    ))).scalar() or 0

    stats = {
        "totalEmployees": emp_count,
        "present": count_status(day_records, "Present"),
        "absent": count_status(day_records, "Absent"),
        "late": count_status(day_records, "Late"),
        "earlyGoing": count_status(day_records, "EarlyGoing"),
        "halfDay": count_status(day_records, "Half Day", "HalfDay"),
        "onLeave": count_status(day_records, "Leave"),
        "weeklyOff": count_status(day_records, "WeeklyOff"),
        "holiday": count_status(day_records, "Holiday"),
        "wfh": count_status(day_records, "WFH"),
        "onDuty": count_status(day_records, "OnDuty", "OD"),
        "missingPunch": count_status(day_records, "MissingPunch", "MissingInPunch", "MissingOutPunch"),
        "missingInPunch": count_status(day_records, "MissingInPunch"),
        "missingOutPunch": count_status(day_records, "MissingOutPunch"),
        "notYetPunched": count_status(day_records, "NotYetPunched"),
        "lwp": count_status(day_records, "LWP"),
        "pendingRequests": pending_req,
        "pendingOvertime": pending_ot,
    }

    trend_result = await db.execute(
        select(
            func.strftime("%Y-%m-%d", Attendance.date).label("day"),
            func.sum(func.cast(Attendance.status == "Present", Integer)).label("present"),
            func.sum(func.cast(Attendance.status == "Absent", Integer)).label("absent"),
            func.sum(func.cast(Attendance.is_late, Integer)).label("late"),
        )
        .where(Attendance.tenant_id == user.tenant_id, Attendance.date >= day_start - timedelta(days=6))
        .group_by(func.strftime("%Y-%m-%d", Attendance.date))
        .order_by(func.strftime("%Y-%m-%d", Attendance.date))
    )
    trend = [{"date": r[0] or "", "present": r[1] or 0, "absent": r[2] or 0, "late": r[3] or 0} for r in trend_result.all()]

    return {
        "date": day_start.strftime("%Y-%m-%d"),
        "stats": stats,
        "departmentWise": [],
        "locationWise": [],
        "trend": trend,
    }


# --- Attendance raw logs ---
@router.get("/attendance-raw-logs")
async def list_attendance_raw_logs(
    employee_id: Optional[str] = None,
    sync_status: Optional[str] = None,
    source: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AttendanceRawLog).where(AttendanceRawLog.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(AttendanceRawLog.employee_id == employee_id)
    if sync_status and sync_status != "all":
        stmt = stmt.where(AttendanceRawLog.sync_status == sync_status)
    if source and source != "all":
        stmt = stmt.where(AttendanceRawLog.source == source)
    if from_:
        try: stmt = stmt.where(AttendanceRawLog.punch_time >= datetime.fromisoformat(from_))
        except ValueError: pass
    if to:
        try: stmt = stmt.where(AttendanceRawLog.punch_time <= datetime.fromisoformat(to + "T23:59:59"))
        except ValueError: pass
    stmt = stmt.order_by(AttendanceRawLog.punch_time.desc()).limit(500)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]


@router.post("/attendance-raw-logs")
async def create_attendance_raw_log(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenant_id"] = user.tenant_id
    allowed = {c.key for c in AttendanceRawLog.__table__.columns} - {"id"}
    def to_snake(k): return re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
    mapped = {}
    for k, v in body.items():
        col = k if k in allowed else to_snake(k)
        if col in allowed:
            mapped[col] = v
    obj = AttendanceRawLog(**mapped)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return _serialize(obj)


# --- Attendance settings ---
_ATTENDANCE_SETTINGS_DEFAULTS = {
    "allowWebClockIn": True, "allowMobileClockIn": True, "allowBiometric": True,
    "allowFaceRecognition": False, "allowQRCode": False, "allowKiosk": False,
    "allowManualAttendance": True, "allowAPIAttendance": False,
    "requireSelfie": False, "requireGeoLocation": False, "requireGeoFence": False,
    "requireDeviceBinding": False, "requireWiFiRestriction": False, "requireIPRestriction": False,
    "allowMultiplePunches": True, "allowBreakPunches": True, "allowOfflinePunch": True, "autoSyncOfflinePunch": True,
    "enableGeoFencing": False, "geoFenceRadiusMeters": 100, "allowOutsideGeoFenceWithApproval": True,
    "captureLatLong": True, "captureAddress": False,
    "enableLateComing": True, "lateGraceMinutes": 15, "maxLateComingPerMonth": 3,
    "deductHalfDayAfterLateMarks": 3, "deductLeaveAfterLateMarks": 5,
    "enableEarlyGoing": True, "earlyGoingGraceMinutes": 15, "maxEarlyGoingPerMonth": 3,
    "deductHalfDayAfterEarlyGoingMarks": 3,
    "minHoursForFullDay": 8, "minHoursForHalfDay": 4, "lessThanHalfDayHoursIsAbsent": 2,
    "includeBreakInWorkingHours": False, "useFirstInLastOut": True,
    "allowRegularization": True, "maxRegularizationPerMonth": 3, "maxBackdatedDays": 7,
    "attachmentRequiredForReg": False, "reasonRequiredForReg": True,
    "regApprovalRequired": True, "allowManagerApplyOnBehalf": True, "allowHRApplyOnBehalf": True,
    "allowRegAfterAttendanceLock": False, "allowRegAfterPayrollLock": False,
    "enableOvertime": True, "otMinHoursRequired": 1, "otDailyLimit": 4, "otMonthlyLimit": 40,
    "otRoundOffMethod": "Round30", "otApprovalRequired": True,
    "enableAttendanceLock": False, "lockFrequency": "Monthly", "lockAfterDays": 5,
    "allowUnlock": True, "unlockApprovalRequired": True,
    "sendAttendanceToPayroll": True, "attendanceCutOffDate": 25, "blockChangesAfterPayrollProcessed": True,
}

@router.get("/attendance-settings")
async def get_attendance_settings(
    entity_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import json as _json
    scope_id = entity_id or "__default__"
    def_stmt = select(AttendanceSetting).where(
        AttendanceSetting.tenant_id == user.tenant_id,
        AttendanceSetting.category == "global",
        AttendanceSetting.key == "__default__",
    )
    def_result = await db.execute(def_stmt)
    def_row = def_result.scalars().first()
    default_settings = _json.loads(def_row.value) if def_row and def_row.value else _ATTENDANCE_SETTINGS_DEFAULTS.copy()

    if scope_id == "__default__":
        return {
            "scope": "default", "entityId": "__default__", "entity": None,
            "isDefault": True, "settings": default_settings,
            "defaultSettings": _ATTENDANCE_SETTINGS_DEFAULTS,
            "hasOverride": False, "updatedAt": None, "updatedBy": None,
        }

    ov_stmt = select(AttendanceSetting).where(
        AttendanceSetting.tenant_id == user.tenant_id,
        AttendanceSetting.category == "entity",
        AttendanceSetting.key == scope_id,
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


@router.put("/attendance-settings")
async def put_attendance_settings(
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
    stmt = select(AttendanceSetting).where(
        AttendanceSetting.tenant_id == user.tenant_id,
        AttendanceSetting.category == category,
        AttendanceSetting.key == scope_id,
    )
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row:
        row.value = _json.dumps(settings)
    else:
        row = AttendanceSetting(tenant_id=user.tenant_id, category=category, key=scope_id, value=_json.dumps(settings))
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return await get_attendance_settings(entity_id=entity_id, db=db, user=user)


@router.delete("/attendance-settings")
async def delete_attendance_settings(
    entity_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    scope_id = entity_id or "__default__"
    if scope_id == "__default__":
        raise HTTPException(status_code=400, detail="Cannot delete default settings")
    result = await db.execute(select(AttendanceSetting).where(
        AttendanceSetting.tenant_id == user.tenant_id,
        AttendanceSetting.category == "entity",
        AttendanceSetting.key == scope_id,
    ))
    row = result.scalars().first()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True, "deleted": row is not None}
