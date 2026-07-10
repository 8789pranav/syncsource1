from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.employee_service import EmployeeService
from app.schemas.schemas import EmployeeCreate, EmployeeUpdate
from app.models.models import User, Employee
from app.models.extended_models import EmployeeDocument
from app.api.crud_factory import _serialize
from typing import Optional

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("")
async def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    q: Optional[str] = None,
    department_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = EmployeeService(db)
    return await service.list(
        tenant_id=user.tenant_id,
        page=page, page_size=page_size,
        q=q, department_id=department_id, entity_id=entity_id,
        branch_id=branch_id, status=status,
    )


@router.get("/picker")
async def employee_picker(
    q: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Employee).where(Employee.tenant_id == user.tenant_id, Employee.employee_status == "Active")
    if q:
        stmt = stmt.where(or_(
            Employee.first_name.contains(q),
            Employee.last_name.contains(q),
            Employee.employee_code.contains(q),
            Employee.display_name.contains(q),
        ))
    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return [{"id": e.id, "value": e.id, "label": e.display_name or f"{e.first_name} {e.last_name or ''}".strip(), "code": e.employee_code} for e in result.scalars().all()]


@router.get("/with-doc-counts")
async def employees_with_doc_counts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Employee, func.count(EmployeeDocument.id))
        .outerjoin(EmployeeDocument, and_(EmployeeDocument.employee_id == Employee.id, EmployeeDocument.tenant_id == user.tenant_id))
        .where(Employee.tenant_id == user.tenant_id)
        .group_by(Employee.id)
        .limit(50)
    )
    return [{"employee": _serialize(row[0]), "doc_count": row[1]} for row in result.all()]


@router.get("/{employee_id}")
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = EmployeeService(db)
    emp = await service.get_by_id(employee_id, user.tenant_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("")
async def create_employee(
    body: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = EmployeeService(db)
    return await service.create(body.model_dump(), user.tenant_id, user.name)


@router.patch("/{employee_id}")
async def update_employee(
    employee_id: str,
    body: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = EmployeeService(db)
    return await service.update(employee_id, body.model_dump(exclude_unset=True), user.tenant_id, user.name)


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = EmployeeService(db)
    return await service.delete(employee_id, user.tenant_id)
