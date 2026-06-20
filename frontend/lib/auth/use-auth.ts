'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  type AuthUser,
  type Permission,
  type Role,
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessRoute,
} from './roles';

export function useAuth() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const operatorName = useAppStore((s) => s.operatorName);
  const authToken = useAppStore((s) => s.authToken);
  const role = useAppStore((s) => s.authRole);

  const user: AuthUser | null = useMemo(() => {
    if (!isAuthenticated) return null;
    const userRole: Role = role || 'citizen';
    return {
      id: useAppStore.getState().userProfile.id || 'anonymous',
      name: operatorName || 'User',
      role: userRole,
      permissions: getPermissionsForRole(userRole),
    };
  }, [isAuthenticated, operatorName, role]);

  return {
    user,
    isAuthenticated,
    authToken,
    role: role || 'citizen',
    can: (permission: Permission) => hasPermission(user, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    canAccess: (pathname: string) => canAccessRoute(user, pathname),
  };
}
