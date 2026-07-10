"""HR Documents routes — CRUD factory for HR docs and folders."""
from fastapi import APIRouter
from app.api.crud_factory import create_crud_router
from app.models.extended_models import HRDocument, HRDocumentFolder

router = APIRouter(prefix="/api", tags=["hr-documents"])

router.include_router(create_crud_router(HRDocument, "/hr-documents", "hr-documents", ["name"], ["folder_id"]))
router.include_router(create_crud_router(HRDocumentFolder, "/hr-documents/folders", "hr-doc-folders", ["name"]))
