from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.leave_service import LeaveService
from app.schemas.schemas import LeaveApplicationCreate
from app.models.models import User
from typing import Optional

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
    from app.repositories.leave_repository import LeaveRepository
    repo = LeaveRepository(db)
    app = await repo.find_by_id(app_id, user.tenant_id)
    if not app:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Leave application not found")
    return app
