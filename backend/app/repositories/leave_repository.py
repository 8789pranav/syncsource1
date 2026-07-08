from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import LeaveApplication, LeaveType, Workflow, WorkflowStep
from typing import Optional


class LeaveRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_many(
        self,
        tenant_id: str,
        employee_id: Optional[str] = None,
        status: Optional[str] = None,
        leave_type_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[LeaveApplication], int]:
        stmt = select(LeaveApplication).where(LeaveApplication.tenant_id == tenant_id)

        if employee_id:
            stmt = stmt.where(LeaveApplication.employee_id == employee_id)
        if status:
            stmt = stmt.where(LeaveApplication.status == status)
        if leave_type_id:
            stmt = stmt.where(LeaveApplication.leave_type_id == leave_type_id)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(LeaveApplication.applied_at.desc()).offset(skip).limit(limit)
        items = list((await self.db.execute(stmt)).scalars().all())

        return items, total

    async def find_by_id(self, app_id: str, tenant_id: str) -> LeaveApplication | None:
        result = await self.db.execute(
            select(LeaveApplication).where(LeaveApplication.id == app_id, LeaveApplication.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> LeaveApplication:
        app = LeaveApplication(**data)
        self.db.add(app)
        await self.db.commit()
        await self.db.refresh(app)
        return app

    async def get_leave_type(self, leave_type_id: str, tenant_id: str) -> LeaveType | None:
        result = await self.db.execute(
            select(LeaveType).where(LeaveType.id == leave_type_id, LeaveType.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def get_active_workflow(self, tenant_id: str) -> Workflow | None:
        result = await self.db.execute(
            select(Workflow).where(Workflow.tenant_id == tenant_id, Workflow.module == "leave", Workflow.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_workflow_steps(self, workflow_id: str) -> list[WorkflowStep]:
        result = await self.db.execute(
            select(WorkflowStep).where(WorkflowStep.workflow_id == workflow_id).order_by(WorkflowStep.level.asc())
        )
        return list(result.scalars().all())

    async def count_by_status(self, tenant_id: str, status: str) -> int:
        result = await self.db.execute(
            select(func.count()).where(LeaveApplication.tenant_id == tenant_id, LeaveApplication.status == status)
        )
        return result.scalar() or 0
