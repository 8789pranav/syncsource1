from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.models import User
from app.core.security import hash_password


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, tenant_id: str, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.tenant_id == tenant_id, User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def create(self, tenant_id: str, email: str, password: str, name: str, role: str = "admin", employee_id: str | None = None) -> User:
        user = User(
            tenant_id=tenant_id,
            email=email.lower().strip(),
            password_hash=hash_password(password),
            name=name,
            role=role,
            employee_id=employee_id,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_last_login(self, user_id: str, ip: str | None = None):
        await self.db.execute(
            update(User).where(User.id == user_id).values(
                last_login_at=func.now(),
                last_login_ip=ip,
                failed_attempts=0,
                locked_until=None,
            )
        )
        await self.db.commit()

    async def increment_failed_attempts(self, user_id: str, attempts: int, lock: bool = False):
        from datetime import datetime, timedelta
        values = {"failed_attempts": attempts}
        if lock:
            values["locked_until"] = datetime.utcnow() + timedelta(minutes=15)
        await self.db.execute(update(User).where(User.id == user_id).values(**values))
        await self.db.commit()
