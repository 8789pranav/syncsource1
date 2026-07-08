from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.schemas.schemas import LoginRequest, RegisterRequest, TokenResponse
from app.core.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    ip = req.client.host if req.client else None
    service = AuthService(db)
    return await service.login(body.email, body.password, ip)


@router.post("/register")
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register(body.email, body.password, body.name, body.role, body.employee_id)


@router.post("/setup")
async def setup(db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.ensure_default_admin()
    if result:
        return {"message": "Default admin created", "credentials": result}
    return {"message": "Default admin already exists"}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "tenant_id": user.tenant_id,
        "employee_id": user.employee_id,
    }
