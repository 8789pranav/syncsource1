from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from fastapi import HTTPException, status
from datetime import datetime


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def login(self, email: str, password: str, ip: str | None = None) -> dict:
        user = await self.repo.get_by_email(settings.DEFAULT_TENANT_ID, email)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Account temporarily locked")

        if not verify_password(password, user.password_hash):
            attempts = user.failed_attempts + 1
            await self.repo.increment_failed_attempts(user.id, attempts, lock=(attempts >= 5))
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        await self.repo.update_last_login(user.id, ip)

        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "name": user.name,
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "tenant_id": user.tenant_id,
                "employee_id": user.employee_id,
            },
        }

    async def register(self, email: str, password: str, name: str, role: str = "admin", employee_id: str | None = None) -> dict:
        existing = await self.repo.get_by_email(settings.DEFAULT_TENANT_ID, email)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

        user = await self.repo.create(
            tenant_id=settings.DEFAULT_TENANT_ID,
            email=email,
            password=password,
            name=name,
            role=role,
            employee_id=employee_id,
        )
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
        }

    async def ensure_default_admin(self) -> dict | None:
        existing = await self.repo.get_by_email(settings.DEFAULT_TENANT_ID, "admin@nexushr.com")
        if existing:
            return None

        user = await self.repo.create(
            tenant_id=settings.DEFAULT_TENANT_ID,
            email="admin@nexushr.com",
            password="admin123456",
            name="System Admin",
            role="admin",
        )
        return {"id": user.id, "email": user.email, "password": "admin123456"}
