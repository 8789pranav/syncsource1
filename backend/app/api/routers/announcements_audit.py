"""Announcements & Audit routes — CRUD factory + custom audit list."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Announcement, AuditLog, User
from app.api.crud_factory import create_crud_router, _serialize
from typing import Optional

router = APIRouter(prefix="/api", tags=["announcements-audit"])

router.include_router(create_crud_router(Announcement, "/announcements", "announcements", ["title"]))


@router.get("/audit")
async def list_audit(
    module: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AuditLog).where(AuditLog.tenant_id == user.tenant_id)
    if module:
        stmt = stmt.where(AuditLog.module == module)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page-1)*page_size).limit(page_size)
    result = await db.execute(stmt)
    return {"items": [_serialize(r) for r in result.scalars().all()], "total": total, "page": page, "page_size": page_size}
