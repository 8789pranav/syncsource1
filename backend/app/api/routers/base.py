"""
Base utilities shared across all route modules.
Follows SOLID Dependency Inversion — modules depend on these abstractions, not on each other.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, Type, Any
from app.core.database import get_db, Base
from app.core.deps import get_current_user
from app.models.models import User
from app.api.crud_factory import _serialize, _camel_to_snake, create_crud_router
import re
import json


def camel_to_snake(name: str) -> str:
    return _camel_to_snake(name)


def serialize(obj: Any) -> dict:
    return _serialize(obj)


def clean_body_to_model(body: dict, model_cls: Type[Base]) -> dict:
    """Convert camelCase body keys to snake_case model columns."""
    valid_cols = {c.name for c in model_cls.__table__.columns}
    clean = {}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols:
            clean[snake_key] = v
    return clean


def apply_camel_filters(stmt, request: Request, model_cls: Type[Base], filter_fields: list[str]):
    """Apply query param filters checking both snake_case and camelCase."""
    for ff in filter_fields:
        val = request.query_params.get(ff)
        if val is None:
            camel_ff = "".join(
                word.capitalize() if i > 0 else word
                for i, word in enumerate(ff.split("_"))
            )
            val = request.query_params.get(camel_ff)
        if val:
            col = getattr(model_cls, ff, None)
            if col is not None:
                stmt = stmt.where(col == val)
    return stmt


def paginated_response(items: list, total: int, page: int, page_size: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
        "hasNext": page * page_size < total,
        "hasPrev": page > 1,
    }
