"""Admin API routes for roles, users, and rulesets."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission
from app.models.auth import User
from app.schemas.admin import (
    AdminUserItem,
    AdminUserListResponse,
    AdminUserUpdateRequest,
    RoleItem,
    RoleListResponse,
    RulesetActivateResponse,
    RulesetListResponse,
    UpdateRolePermissionsRequest,
)
from app.services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Roles & Permissions
# ---------------------------------------------------------------------------


@router.get(
    "/roles",
    response_model=RoleListResponse,
    summary="List all roles and permission definitions",
    dependencies=[Depends(require_permission("rbac:manage"))],
)
async def get_roles(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RoleListResponse:
    """Fetch all roles with assigned permissions and catalog of permissions."""
    service = AdminService(db)
    return await service.get_roles()


@router.put(
    "/roles/{role_id}/permissions",
    response_model=RoleItem,
    summary="Replace permissions assigned to a role",
    dependencies=[Depends(require_permission("rbac:manage"))],
)
async def update_role_permissions(
    role_id: int,
    req: UpdateRolePermissionsRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RoleItem:
    """Update role permissions matrix atomically."""
    service = AdminService(db)
    return await service.update_role_permissions(role_id=role_id, req=req)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List user accounts with role assignment",
    dependencies=[Depends(require_permission("user:manage"))],
)
async def list_admin_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> AdminUserListResponse:
    """Paginated list of users for administration."""
    service = AdminService(db)
    return await service.list_users(page=page, size=size)


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserItem,
    summary="Update user role or active status",
    dependencies=[Depends(require_permission("user:manage"))],
)
async def update_admin_user(
    user_id: int,
    req: AdminUserUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserItem:
    """Update a user's role or activate/deactivate account."""
    service = AdminService(db)
    return await service.update_user(user_id=user_id, req=req)


# ---------------------------------------------------------------------------
# Rulesets
# ---------------------------------------------------------------------------


@router.get(
    "/rulesets",
    response_model=RulesetListResponse,
    summary="List diagnosis ruleset versions",
    dependencies=[Depends(require_permission("ruleset:manage"))],
)
async def list_rulesets(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RulesetListResponse:
    """List all diagnosis ruleset versions and hyperparameter configurations."""
    service = AdminService(db)
    return await service.list_rulesets()


@router.post(
    "/rulesets/{ruleset_id}/activate",
    response_model=RulesetActivateResponse,
    summary="Activate a ruleset version",
    dependencies=[Depends(require_permission("ruleset:manage"))],
)
async def activate_ruleset(
    ruleset_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RulesetActivateResponse:
    """Set the specified ruleset as active and deactivate all others."""
    service = AdminService(db)
    return await service.activate_ruleset(ruleset_id=ruleset_id, user_id=current_user.id)
