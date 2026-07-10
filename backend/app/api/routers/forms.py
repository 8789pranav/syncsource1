"""Forms routes — CRUD factory registration."""
from fastapi import APIRouter
from app.api.crud_factory import create_crud_router
from app.models.models import FormSchema

router = APIRouter(prefix="/api", tags=["forms"])

router.include_router(create_crud_router(FormSchema, "/forms", "forms", ["code", "name"], ["module"]))
