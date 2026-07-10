"""
Router registry — aggregates all modular route files into a single APIRouter.
Each module is responsible for its own domain (SOLID Single Responsibility).
Custom service routers (auth, employees, leave-applications, dashboard) are
imported from their dedicated files; all other modules live in app/api/routers/.
"""
from fastapi import APIRouter

api_router = APIRouter()

# --- Service-layer routers (auth, employees, dashboard) ---
from app.api.routers.auth import router as auth_router
from app.api.routers.employees import router as employees_router
from app.api.routers.dashboard import router as dashboard_router

api_router.include_router(auth_router, prefix="/api")
api_router.include_router(employees_router, prefix="/api")
api_router.include_router(dashboard_router, prefix="/api")

# --- Domain module routers ---
from app.api.routers.organization import router as organization_router
from app.api.routers.leave_routes import router as leave_router
from app.api.routers.attendance import router as attendance_router
from app.api.routers.holidays_shifts import router as holidays_shifts_router
from app.api.routers.assets import router as assets_router
from app.api.routers.announcements_audit import router as announcements_audit_router
from app.api.routers.forms import router as forms_router
from app.api.routers.hr_documents import router as hr_documents_router
from app.api.routers.documents import router as documents_router
from app.api.routers.payroll import router as payroll_router
from app.api.routers.rosters_workflows import router as rosters_workflows_router
from app.api.routers.employee_sub_records import router as employee_sub_records_router
from app.api.routers.onboarding import router as onboarding_router
from app.api.routers.roles_permissions import router as roles_permissions_router
from app.api.routers.seed import router as seed_router

api_router.include_router(organization_router)
api_router.include_router(leave_router)
api_router.include_router(attendance_router)
api_router.include_router(holidays_shifts_router)
api_router.include_router(assets_router)
api_router.include_router(announcements_audit_router)
api_router.include_router(forms_router)
api_router.include_router(hr_documents_router)
api_router.include_router(documents_router)
api_router.include_router(payroll_router)
api_router.include_router(rosters_workflows_router)
api_router.include_router(employee_sub_records_router)
api_router.include_router(onboarding_router)
api_router.include_router(roles_permissions_router)
api_router.include_router(seed_router)
