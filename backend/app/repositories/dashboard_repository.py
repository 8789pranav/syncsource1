from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import (
    Employee, Department, Designation, Location, Holiday,
    LeaveApplication, Asset, AssetRequest, ProfileUpdateRequest, Announcement
)
from datetime import datetime


class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_employee_stats(self, tenant_id: str) -> dict:
        result = await self.db.execute(
            select(Employee.employee_status, func.count())
            .where(Employee.tenant_id == tenant_id)
            .group_by(Employee.employee_status)
        )
        counts = {row[0]: row[1] for row in result.all()}
        return {
            "total": sum(counts.values()),
            "active": counts.get("Active", 0),
            "on_notice": counts.get("On Notice", 0),
        }

    async def get_pending_counts(self, tenant_id: str) -> dict:
        pending_leaves = (await self.db.execute(
            select(func.count()).where(LeaveApplication.tenant_id == tenant_id, LeaveApplication.status == "Pending")
        )).scalar() or 0
        pending_assets = (await self.db.execute(
            select(func.count()).where(AssetRequest.tenant_id == tenant_id, AssetRequest.status == "Pending")
        )).scalar() or 0
        open_tickets = (await self.db.execute(
            select(func.count()).where(ProfileUpdateRequest.tenant_id == tenant_id, ProfileUpdateRequest.status == "Pending")
        )).scalar() or 0
        return {"pending_leaves": pending_leaves, "pending_assets": pending_assets, "open_tickets": open_tickets}

    async def get_asset_stats(self, tenant_id: str) -> dict:
        result = await self.db.execute(
            select(Asset.status, func.count()).where(Asset.tenant_id == tenant_id).group_by(Asset.status)
        )
        counts = {row[0]: row[1] for row in result.all()}
        return {
            "assigned": counts.get("Assigned", 0),
            "in_stock": counts.get("In Stock", 0),
        }

    async def get_headcount_by_dept(self, tenant_id: str) -> list[dict]:
        result = await self.db.execute(
            select(Department.name, func.count(Employee.id))
            .join(Employee, Employee.department_id == Department.id)
            .where(Employee.tenant_id == tenant_id)
            .group_by(Department.name)
        )
        return [{"name": row[0], "value": row[1]} for row in result.all() if row[1] > 0]

    async def get_headcount_by_location(self, tenant_id: str) -> list[dict]:
        result = await self.db.execute(
            select(Location.name, func.count(Employee.id))
            .join(Employee, Employee.location_id == Location.id)
            .where(Employee.tenant_id == tenant_id)
            .group_by(Location.name)
        )
        return [{"name": row[0], "value": row[1]} for row in result.all() if row[1] > 0]

    async def get_gender_ratio(self, tenant_id: str) -> list[dict]:
        result = await self.db.execute(
            select(Employee.gender, func.count()).where(Employee.tenant_id == tenant_id).group_by(Employee.gender)
        )
        return [{"name": row[0] or "Unknown", "value": row[1]} for row in result.all() if row[1] > 0]

    async def get_recent_joiners(self, tenant_id: str, limit: int = 5) -> list[dict]:
        result = await self.db.execute(
            select(Employee).where(Employee.tenant_id == tenant_id, Employee.date_of_joining.isnot(None))
            .order_by(Employee.date_of_joining.desc()).limit(limit)
        )
        emps = result.scalars().all()
        return [
            {
                "id": e.id,
                "name": e.display_name or f"{e.first_name} {e.last_name or ''}".strip(),
                "code": e.employee_code,
                "date_of_joining": e.date_of_joining.isoformat() if e.date_of_joining else None,
            }
            for e in emps
        ]

    async def get_upcoming_holidays(self, tenant_id: str, limit: int = 5) -> list[dict]:
        result = await self.db.execute(
            select(Holiday).where(Holiday.tenant_id == tenant_id, Holiday.date >= datetime.utcnow())
            .order_by(Holiday.date.asc()).limit(limit)
        )
        holidays = result.scalars().all()
        return [
            {"id": h.id, "name": h.name, "date": h.date.isoformat(), "type": h.type}
            for h in holidays
        ]

    async def get_pending_requests(self, tenant_id: str) -> list[dict]:
        leave_result = await self.db.execute(
            select(LeaveApplication).where(LeaveApplication.tenant_id == tenant_id, LeaveApplication.status == "Pending")
            .order_by(LeaveApplication.applied_at.desc()).limit(10)
        )
        leaves = leave_result.scalars().all()
        return [
            {
                "id": l.id,
                "kind": "Leave",
                "employee_id": l.employee_id,
                "type": "Leave Application",
                "date": l.applied_at.isoformat() if l.applied_at else None,
                "status": l.status,
            }
            for l in leaves
        ]

    async def get_on_leave_today(self, tenant_id: str) -> int:
        today = datetime.utcnow().date()
        result = await self.db.execute(
            select(func.count()).where(
                LeaveApplication.tenant_id == tenant_id,
                LeaveApplication.status == "Approved",
                func.date(LeaveApplication.from_date) <= today,
                func.date(LeaveApplication.to_date) >= today,
            )
        )
        return result.scalar() or 0
