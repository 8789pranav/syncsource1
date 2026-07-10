"""Holidays & Shifts routes — CRUD factory registrations."""
from fastapi import APIRouter
from app.api.crud_factory import create_crud_router
from app.models.models import Holiday, Shift, WeeklyOffCalendar

router = APIRouter(prefix="/api", tags=["holidays-shifts"])

router.include_router(create_crud_router(Holiday, "/holidays", "holidays", ["name"]))
router.include_router(create_crud_router(Shift, "/shifts", "shifts", ["code", "name"]))
router.include_router(create_crud_router(WeeklyOffCalendar, "/weekly-off-calendars", "weekly-off", ["code", "name"]))
