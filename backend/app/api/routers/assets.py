"""Asset routes — categories, assets, requests. CRUD factory registrations."""
from fastapi import APIRouter
from app.api.crud_factory import create_crud_router
from app.models.models import AssetCategory, Asset, AssetRequest

router = APIRouter(prefix="/api", tags=["assets"])

router.include_router(create_crud_router(AssetCategory, "/asset-categories", "asset-categories", ["code", "name"]))
router.include_router(create_crud_router(Asset, "/assets", "assets", ["asset_code", "name", "serial_number"], ["category_id", "status"]))
router.include_router(create_crud_router(AssetRequest, "/asset-requests", "asset-requests", ["employee_id"], ["employee_id", "status"]))
