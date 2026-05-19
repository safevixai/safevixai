"""Role-Based Access Control (RBAC) for SafeVixAI Backend.

Defines user roles, permission checks, and FastAPI dependencies for
enforcing role-based access on protected endpoints.

Roles:
    - admin: Full system access, including admin endpoints and user management.
    - operator: Can trigger SOS, manage road reports, and access operational tools.
    - user: Standard authenticated user with access to core features.
    - readonly: Read-only access to public data and emergency information.
"""
from __future__ import annotations

from enum import Enum
from typing import Annotated

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.security import get_current_user

security = HTTPBearer(auto_error=False)


class Role(str, Enum):
    """User roles with hierarchical permissions."""

    ADMIN = "admin"
    OPERATOR = "operator"
    USER = "user"
    READONLY = "readonly"


# Permission hierarchy: higher roles inherit lower role permissions
ROLE_HIERARCHY = {
    Role.ADMIN: [Role.ADMIN, Role.OPERATOR, Role.USER, Role.READONLY],
    Role.OPERATOR: [Role.OPERATOR, Role.USER, Role.READONLY],
    Role.USER: [Role.USER, Role.READONLY],
    Role.READONLY: [Role.READONLY],
}


def _has_permission(user_role: str, required_role: Role) -> bool:
    """Check if user_role has the required_role permission."""
    try:
        role_enum = Role(user_role)
    except ValueError:
        return False
    
    allowed_roles = ROLE_HIERARCHY.get(role_enum, [])
    return required_role in allowed_roles


async def require_role(required_role: Role):
    """FastAPI dependency that enforces role-based access.
    
    Usage:
        @router.get("/admin/users")
        async def list_users(user: dict = Depends(require_role(Role.ADMIN))):
            ...
    """
    user = await get_current_user()
    user_role = user.get("role", Role.READONLY.value)
    
    if not _has_permission(user_role, required_role):
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. Required role: {required_role.value}",
        )
    
    return user


# Type aliases for common role requirements
AdminUser = Annotated[dict, Depends(require_role(Role.ADMIN))]
OperatorUser = Annotated[dict, Depends(require_role(Role.OPERATOR))]
AuthenticatedUser = Annotated[dict, Depends(require_role(Role.USER))]
ReadOnlyUser = Annotated[dict, Depends(require_role(Role.READONLY))]
