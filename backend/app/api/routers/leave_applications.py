from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.leave_service import LeaveService
from app.schemas.schemas import LeaveApplicationCreate
from app.models.models import User, LeaveApplication
from app.api.crud_factory import _serialize
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/leave-applications", tags=["leave"])


@router.get("")
async def list_leave_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    leave_type_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = LeaveService(db)
    return await service.list(
        tenant_id=user.tenant_id,
        page=page, page_size=page_size,
        employee_id=employee_id, status=status, leave_type_id=leave_type_id,
    )


@router.post("")
async def create_leave_application(
    body: LeaveApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = LeaveService(db)
    return await service.apply(user.tenant_id, body.model_dump())


@router.get("/{app_id}")
async def get_leave_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LeaveApplication).where(
            LeaveApplication.id == app_id,
            LeaveApplication.tenant_id == user.tenant_id,
        )
    )
    app = result.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Leave application not found")
    return _serialize(app)


@router.patch("/{app_id}")
async def update_leave_application(
    app_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    result = await db.execute(
        select(LeaveApplication).where(
            LeaveApplication.id == app_id,
            LeaveApplication.tenant_id == user.tenant_id,
        )
    )
    app = result.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Leave application not found")

    action = body.get("action", "").lower()
    status = body.get("status", "")
    comment = body.get("decisionComment") or body.get("comment") or body.get("reason") or ""

    if action in ("approve",) or status == "Approved":
        app.status = "Approved"
        app.decision_comment = comment
        app.decision_at = datetime.utcnow()
        app.decision_by = user.name or user.id
    elif action in ("reject",) or status == "Rejected":
        app.status = "Rejected"
        app.decision_comment = comment
        app.decision_at = datetime.utcnow()
        app.decision_by = user.name or user.id
    elif action in ("cancel",) or status in ("Cancelled", "Withdrawn"):
        app.status = status or "Cancelled"
        app.decision_comment = comment
        app.decision_at = datetime.utcnow()
        app.decision_by = user.name or user.id
    else:
        allowed = {"status", "reason", "decision_comment"}
        for k, v in body.items():
            col = k if hasattr(LeaveApplication, k) else None
            snake = "".join(["_" + c.lower() if c.isupper() else c for c in k]).lstrip("_")
            col = snake if hasattr(LeaveApplication, snake) else col
            if col and col in allowed:
                setattr(app, col, v)

    await db.commit()
    await db.refresh(app)
    return _serialize(app)
