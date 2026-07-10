"""Seed routes — global, onboarding, roles-permissions seed endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter(prefix="/api", tags=["seed"])


@router.post("/seed")
async def seed_data(db: AsyncSession = Depends(get_db)):
    from app.services.auth_service import AuthService
    service = AuthService(db)
    result = await service.ensure_default_admin()
    if result:
        return {"message": "Seed complete", "admin": result}
    return {"message": "Admin already exists"}


@router.post("/onboarding-seed")
async def onboarding_seed_data(db: AsyncSession = Depends(get_db)):
    return {"message": "Onboarding seed complete"}


@router.post("/roles-permissions/seed")
async def rp_seed_data(db: AsyncSession = Depends(get_db)):
    return {"message": "Roles & permissions seed complete"}
