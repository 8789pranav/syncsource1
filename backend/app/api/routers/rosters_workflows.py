"""Roster & Workflow routes — CRUD factory registrations."""
from fastapi import APIRouter
from app.api.crud_factory import create_crud_router
from app.models.models import Workflow, WorkflowStep
from app.models.extended_models import Roster, RosterEntry

router = APIRouter(prefix="/api", tags=["rosters-workflows"])

router.include_router(create_crud_router(Roster, "/rosters", "rosters", ["code", "name"]))
router.include_router(create_crud_router(RosterEntry, "/rosters/{roster_id}/entries", "roster-entries", ["employee_id"]))
router.include_router(create_crud_router(Workflow, "/workflows", "workflows", ["code", "name"], ["module"]))
router.include_router(create_crud_router(WorkflowStep, "/workflows/{workflow_id}/steps", "workflow-steps"))
