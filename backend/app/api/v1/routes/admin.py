"""Admin-only system management endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, require_permission
from app.core.config import get_settings
from app.models.auth import User
from scripts.seed import seed_database

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/reseed",
    status_code=status.HTTP_200_OK,
    summary="Re-run database seeding (authenticated)",
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


@router.get(
    "/fix-permissions",
    status_code=status.HTTP_200_OK,
    summary="Emergency permission fix endpoint",
)
async def fix_permissions(
    secret: Annotated[str, Query(description="Admin password for authentication")],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Emergency endpoint to fix missing permissions without requiring login.

    Use the ADMIN_PASSWORD as the secret parameter.
    This endpoint will be removed after the fix is deployed.
    """
    settings = get_settings()
    if secret != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid secret")

    await seed_database(db)
    return {"message": "Permissions fixed successfully! You can now delete data."}
