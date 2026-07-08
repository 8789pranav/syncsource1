from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.dashboard_repository import DashboardRepository
from datetime import datetime


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DashboardRepository(db)

    async def get_dashboard_data(self, tenant_id: str) -> dict:
        stats, pending, assets, headcount_dept, headcount_loc, gender, joiners, holidays, pending_reqs, on_leave = await (
            self._gather_all(tenant_id)
        )

        return {
            "stats": {
                "totalEmployees": stats["total"],
                "activeEmployees": stats["active"],
                "onNotice": stats["on_notice"],
                "newThisMonth": 0,
                "pendingApprovals": pending["pending_leaves"] + pending["pending_assets"],
                "openTickets": pending["open_tickets"],
                "assetsAssigned": assets["assigned"],
                "assetsInStock": assets["in_stock"],
                "onLeaveToday": on_leave,
                "avgAttendance": 0,
            },
            "headcountByDept": headcount_dept,
            "headcountByLocation": headcount_loc,
            "genderRatio": gender,
            "joiningsByMonth": [],
            "leaveTrend": [],
            "attendanceTrend": [],
            "assetStatus": [
                {"name": "Assigned", "value": assets["assigned"]},
                {"name": "In Stock", "value": assets["in_stock"]},
            ],
            "recentJoiners": joiners,
            "upcomingHolidays": holidays,
            "pendingRequests": pending_reqs,
            "onLeaveTodayList": [],
            "upcomingBirthdays": [],
            "upcomingAnniversaries": [],
        }

    async def _gather_all(self, tenant_id: str):
        import asyncio
        return await asyncio.gather(
            self.repo.get_employee_stats(tenant_id),
            self.repo.get_pending_counts(tenant_id),
            self.repo.get_asset_stats(tenant_id),
            self.repo.get_headcount_by_dept(tenant_id),
            self.repo.get_headcount_by_location(tenant_id),
            self.repo.get_gender_ratio(tenant_id),
            self.repo.get_recent_joiners(tenant_id),
            self.repo.get_upcoming_holidays(tenant_id),
            self.repo.get_pending_requests(tenant_id),
            self.repo.get_on_leave_today(tenant_id),
        )
