"""Admin-only system management endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, require_permission
from app.models.auth import User
from scripts.seed import seed_database

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/reseed",
    status_code=status.HTTP_200_OK,
    summary="Re-run database seeding",
)
async def reseed_database(
    current_user: Annotated[User, Depends(require_permission("rbac:manage"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Re-run idempotent database seed to add missing permissions/roles.

    Requires rbac:manage permission (admin only).
    Safe to call multiple times - updates only what's missing.
    """
    await seed_database(db)
    return {"message": "Database reseeded successfully"}
