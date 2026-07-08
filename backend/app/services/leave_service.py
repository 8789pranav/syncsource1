from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.leave_repository import LeaveRepository
from app.models.models import LeaveApplicationDay, LeaveApproval, LeaveLedger, LeaveBalance, WorkflowInstance
from fastapi import HTTPException
from datetime import datetime, timedelta
import json


class LeaveService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = LeaveRepository(db)

    async def list(self, tenant_id: str, page: int = 1, page_size: int = 50, **filters) -> dict:
        skip = (page - 1) * page_size
        items, total = await self.repo.find_many(tenant_id, skip=skip, limit=page_size, **filters)
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": page * page_size < total,
            "has_prev": page > 1,
        }

    async def apply(self, tenant_id: str, data: dict) -> dict:
        employee_id = data.get("employee_id")
        leave_type_id = data.get("leave_type_id")
        from_date = data.get("from_date")
        to_date = data.get("to_date")

        if not employee_id or not leave_type_id or not from_date or not to_date:
            raise HTTPException(status_code=400, detail="employee_id, leave_type_id, from_date, to_date are required")

        if isinstance(from_date, str):
            from_date = datetime.fromisoformat(from_date)
        if isinstance(to_date, str):
            to_date = datetime.fromisoformat(to_date)

        if to_date < from_date:
            raise HTTPException(status_code=400, detail="to_date cannot be before from_date")

        leave_type = await self.repo.get_leave_type(leave_type_id, tenant_id)
        if not leave_type:
            raise HTTPException(status_code=404, detail="Leave type not found")

        half_day = data.get("half_day", False)
        hours = data.get("hours")

        if half_day:
            days = 0.5
        elif hours and leave_type.leave_unit in ("Hourly", "Mixed"):
            days = round((hours / 8) * 100) / 100
        else:
            days = (to_date - from_date).days + 1

        if days <= 0:
            raise HTTPException(status_code=400, detail="days must be greater than zero")

        workflow = await self.repo.get_active_workflow(tenant_id)
        status_val = "Pending" if workflow else "AutoApproved"

        app = await self.repo.create({
            "tenant_id": tenant_id,
            "employee_id": employee_id,
            "leave_type_id": leave_type_id,
            "from_date": from_date,
            "to_date": to_date,
            "days": days,
            "half_day": half_day,
            "half_day_type": data.get("half_day_type"),
            "hours": hours,
            "reason": data.get("reason", ""),
            "attachment_url": data.get("attachment_url", ""),
            "status": status_val,
            "applied_at": datetime.utcnow(),
        })

        # Create per-day entries
        current = from_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = to_date.replace(hour=0, minute=0, second=0, microsecond=0)
        while current <= end:
            self.db.add(LeaveApplicationDay(
                application_id=app.id,
                date=current,
                day_type=data.get("half_day_type", "FullDay") if half_day else "FullDay",
                hours=hours,
                counted=True,
            ))
            current += timedelta(days=1)

        # Ledger entry
        self.db.add(LeaveLedger(
            tenant_id=tenant_id,
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            transaction_type="LeaveApplied" if workflow else "LeaveApproved",
            debit=days,
            reference_type="LeaveApplication",
            reference_id=app.id,
            remarks=f"Leave {'applied' if workflow else 'auto-approved'} ({days} day(s))",
            created_by=employee_id,
        ))

        # If no workflow, auto-approve
        if not workflow:
            from sqlalchemy import update as sa_update
            from app.models.models import LeaveApplication as LA
            await self.db.execute(
                sa_update(LA).where(LA.id == app.id).values(
                    status="AutoApproved",
                    decision_at=datetime.utcnow(),
                    decision_by="system",
                    decision_comment="Auto-approved (no leave workflow configured)",
                )
            )

        # If workflow, create instance + approvals
        if workflow:
            steps = await self.repo.get_workflow_steps(workflow.id)
            instance = WorkflowInstance(
                tenant_id=tenant_id,
                workflow_id=workflow.id,
                module="leave",
                record_id=app.id,
                initiator_id=employee_id,
                status="Pending",
                current_level=1,
            )
            self.db.add(instance)
            await self.db.flush()

            first_approver_id = None
            for step in steps:
                self.db.add(LeaveApproval(
                    application_id=app.id,
                    step_order=step.level,
                    approver_type=step.approver_type,
                    approver_id=step.approver_id,
                    action="Pending",
                ))
                if step.level == 1:
                    first_approver_id = step.approver_id

            from sqlalchemy import update as sa_update
            from app.models.models import LeaveApplication as LA
            await self.db.execute(
                sa_update(LA).where(LA.id == app.id).values(
                    workflow_instance_id=instance.id,
                    current_approver_id=first_approver_id,
                )
            )

        await self.db.commit()
        return await self.repo.find_by_id(app.id, tenant_id)
