"""
Organization routes — Entity, Branch, Department, Designation, Grade, Location.
Single Responsibility: manages organization master data.
"""
from fastapi import APIRouter
from app.api.crud_factory import create_crud_router
from app.models.models import Entity, Branch, Department, Designation, Grade, Location

router = APIRouter(prefix="/api", tags=["organization"])

router.include_router(create_crud_router(Entity, "/entities", "entities", ["code", "legal_name", "trade_name"]))
router.include_router(create_crud_router(Branch, "/branches", "branches", ["code", "name", "city"]))
router.include_router(create_crud_router(Department, "/departments", "departments", ["code", "name"], ["entity_id", "branch_id"]))
router.include_router(create_crud_router(Designation, "/designations", "designations", ["code", "name"]))
router.include_router(create_crud_router(Grade, "/grades", "grades", ["code", "name"]))
router.include_router(create_crud_router(Location, "/locations", "locations", ["code", "name", "city"]))
