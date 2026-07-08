"""
Generic CRUD router factory — generates standard list/get/create/update/delete
endpoints for any SQLAlchemy model with tenant_id scoping.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, Type, Any
from app.core.database import get_db, Base
from app.core.deps import get_current_user
from app.models.models import User
import json
import re


def _camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def create_crud_router(
    model: Type[Base],
    prefix: str,
    tag: str,
    search_fields: list[str] | None = None,
    filter_fields: list[str] | None = None,
    order_by: str = "created_at",
    parent_id_field: str | None = None,
    parent_id_param: str | None = None,
) -> APIRouter:
    """Create a full CRUD router for a model with tenant_id scoping.

    When parent_id_field and parent_id_param are provided, routes are nested
    under a parent path parameter (e.g. /employees/{employee_id}/family).
    All queries are filtered by parent_id_field == parent_id_param value,
    and create auto-sets the parent_id_field from the path.
    """

    router = APIRouter(prefix=prefix, tags=[tag])

    def _tenant_filter(user: User):
        return model.tenant_id == user.tenant_id

    def _parent_filter(parent_id: str):
        if parent_id_field and parent_id_param:
            return getattr(model, parent_id_field) == parent_id
        return None

    # Determine route paths based on whether we have a parent ID
    if parent_id_field and parent_id_param:
        list_path = "/{parent_id}"
        item_path = "/{parent_id}/{item_id}"
    else:
        list_path = ""
        item_path = "/{item_id}"

    @router.get(list_path)
    async def list_items(
        request: Request,
        parent_id: str = None if not parent_id_field else None,
        page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=100),
        q: Optional[str] = None,
        db: AsyncSession = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        stmt = select(model).where(_tenant_filter(user))

        if parent_id_field and parent_id is not None:
            stmt = stmt.where(_parent_filter(parent_id))

        if q and search_fields:
            conditions = []
            for field_name in search_fields:
                col = getattr(model, field_name, None)
                if col is not None:
                    conditions.append(col.contains(q))
            if conditions:
                stmt = stmt.where(or_(*conditions))

        # Apply filter fields from query params
        if filter_fields:
            for ff in filter_fields:
                val = request.query_params.get(ff)
                if val:
                    col = getattr(model, ff, None)
                    if col is not None:
                        stmt = stmt.where(col == val)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        order_col = getattr(model, order_by, None)
        if order_col is not None:
            stmt = stmt.order_by(order_col.desc())

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(stmt)
        items = result.scalars().all()

        return {
            "items": [_serialize(item) for item in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": page * page_size < total,
            "has_prev": page > 1,
        }

    @router.get(item_path)
    async def get_item(
        item_id: str,
        parent_id: str = None if not parent_id_field else None,
        db: AsyncSession = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        stmt = select(model).where(model.id == item_id, _tenant_filter(user))
        if parent_id_field and parent_id is not None:
            stmt = stmt.where(_parent_filter(parent_id))
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"{tag[:-1] if tag.endswith('s') else tag} not found")
        return _serialize(item)

    @router.post(list_path)
    async def create_item(
        request: Request,
        parent_id: str = None if not parent_id_field else None,
        db: AsyncSession = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        body = await request.json()
        body["tenant_id"] = user.tenant_id
        if parent_id_field and parent_id is not None:
            body[parent_id_field] = parent_id

        # Convert camelCase keys to snake_case for model columns
        valid_cols = {c.name for c in model.__table__.columns}
        clean = {}
        for k, v in body.items():
            snake_key = _camel_to_snake(k)
            if snake_key in valid_cols:
                clean[snake_key] = v

        item = model(**clean)
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return _serialize(item)

    @router.patch(item_path)
    async def update_item(
        item_id: str,
        request: Request,
        parent_id: str = None if not parent_id_field else None,
        db: AsyncSession = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        stmt = select(model).where(model.id == item_id, _tenant_filter(user))
        if parent_id_field and parent_id is not None:
            stmt = stmt.where(_parent_filter(parent_id))
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"{tag[:-1] if tag.endswith('s') else tag} not found")

        body = await request.json()
        valid_cols = {c.name for c in model.__table__.columns}
        for k, v in body.items():
            snake_key = _camel_to_snake(k)
            if snake_key in valid_cols and snake_key != "id" and snake_key != "tenant_id":
                setattr(item, snake_key, v)

        await db.commit()
        await db.refresh(item)
        return _serialize(item)

    @router.delete(item_path)
    async def delete_item(
        item_id: str,
        parent_id: str = None if not parent_id_field else None,
        db: AsyncSession = Depends(get_db),
        user: User = Depends(get_current_user),
    ):
        stmt = select(model).where(model.id == item_id, _tenant_filter(user))
        if parent_id_field and parent_id is not None:
            stmt = stmt.where(_parent_filter(parent_id))
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail=f"{tag[:-1] if tag.endswith('s') else tag} not found")
        await db.delete(item)
        await db.commit()
        return {"ok": True}

    return router


def _serialize(obj: Any) -> dict:
    """Serialize a SQLAlchemy model instance to dict with camelCase keys."""
    if obj is None:
        return {}
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name, None)
        if hasattr(val, "isoformat"):
            val = val.isoformat()
        # snake_case → camelCase
        parts = col.name.split("_")
        key = parts[0] + "".join(p.capitalize() for p in parts[1:])
        result[key] = val
    return result
