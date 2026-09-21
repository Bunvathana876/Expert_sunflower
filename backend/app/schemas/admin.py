"""Pydantic schemas for admin console: roles, permissions, users, rulesets, feedback."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------


class PermissionItem(BaseModel):
    """Permission detail."""

    model_config = ConfigDict(frozen=True)

    id: int
    code: str
    description: str | None = None


class RoleItem(BaseModel):
    """Role with associated permission codes."""

    model_config = ConfigDict(frozen=True)

    id: int
    name: str
    description: str | None = None
    permissions: list[str]


class RoleListResponse(BaseModel):
    """List of all roles."""

    model_config = ConfigDict(frozen=True)

    items: list[RoleItem]
    permissions: list[PermissionItem]


class UpdateRolePermissionsRequest(BaseModel):
    """Request to update a role's permissions."""

    permission_codes: list[str] = Field(..., min_length=0)


# ---------------------------------------------------------------------------
# User Administration
# ---------------------------------------------------------------------------


class AdminUserItem(BaseModel):
    """User account details for administration."""

    model_config = ConfigDict(frozen=True)

    id: int
    username: str
    email: str
    role: str
    role_id: int
    is_active: bool
    created_at: str


class AdminUserListResponse(BaseModel):
    """Paginated list of user accounts."""

    model_config = ConfigDict(frozen=True)

    items: list[AdminUserItem]
    total: int
    page: int
    size: int


class AdminUserUpdateRequest(BaseModel):
    """Payload to update user active status or assigned role."""

    role_id: int | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# Ruleset Administration
# ---------------------------------------------------------------------------


class RulesetItem(BaseModel):
    """Versioned diagnosis ruleset."""

    model_config = ConfigDict(frozen=True)

    id: int
    version: str
    algorithm: str
    params: dict[str, Any]
    is_active: bool
    published_at: str | None = None
    published_by: str | None = None


class RulesetListResponse(BaseModel):
    """List of all engine rulesets."""

    model_config = ConfigDict(frozen=True)

    items: list[RulesetItem]


class RulesetActivateResponse(BaseModel):
    """Confirmation of ruleset activation."""

    model_config = ConfigDict(frozen=True)

    id: int
    version: str
    is_active: bool


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------


class FeedbackItem(BaseModel):
    """Grower feedback item."""

    model_config = ConfigDict(frozen=True)

    id: int
    subject: str
    message: str
    status: str
    created_at: str
    user_id: int | None = None
    user_name: str | None = None
    diagnosis_session_id: str | None = None
    media_url: str | None = None


class FeedbackListResponse(BaseModel):
    """Paginated feedback list."""

    model_config = ConfigDict(frozen=True)

    items: list[FeedbackItem]
    total: int
    page: int
    size: int


class FeedbackCreateRequest(BaseModel):
    """Payload to submit new feedback."""

    subject: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    diagnosis_session_id: str | None = None
    contact_info: str | None = None


class FeedbackStatusUpdateRequest(BaseModel):
    """Payload to transition feedback status."""

    status: str = Field(..., pattern="^(open|in_review|resolved)$")
