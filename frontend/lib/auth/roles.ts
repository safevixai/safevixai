// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

export type Role = 'citizen' | 'officer' | 'admin' | 'super_admin';

export type Permission =
  | 'emergency:sos'
  | 'emergency:view'
  | 'challan:calculate'
  | 'challan:view_history'
  | 'report:submit'
  | 'report:view'
  | 'report:resolve'
  | 'tracking:start'
  | 'tracking:view'
  | 'profile:view'
  | 'profile:edit'
  | 'admin:users_view'
  | 'admin:users_manage'
  | 'admin:roles_manage'
  | 'admin:analytics_view'
  | 'admin:system_config'
  | 'admin:audit_logs'
  | 'assistant:chat'
  | 'assistant:offline'
  | 'settings:view'
  | 'settings:edit';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: Role;
  permissions: Permission[];
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  citizen: [
    'emergency:sos',
    'emergency:view',
    'challan:calculate',
    'challan:view_history',
    'report:submit',
    'report:view',
    'tracking:start',
    'tracking:view',
    'profile:view',
    'profile:edit',
    'assistant:chat',
    'assistant:offline',
    'settings:view',
    'settings:edit',
  ],
  officer: [
    'emergency:sos',
    'emergency:view',
    'challan:calculate',
    'challan:view_history',
    'report:submit',
    'report:view',
    'report:resolve',
    'tracking:start',
    'tracking:view',
    'profile:view',
    'profile:edit',
    'assistant:chat',
    'settings:view',
    'settings:edit',
  ],
  admin: [
    'emergency:sos',
    'emergency:view',
    'challan:calculate',
    'challan:view_history',
    'report:submit',
    'report:view',
    'report:resolve',
    'tracking:start',
    'tracking:view',
    'profile:view',
    'profile:edit',
    'assistant:chat',
    'assistant:offline',
    'settings:view',
    'settings:edit',
    'admin:users_view',
    'admin:users_manage',
    'admin:analytics_view',
    'admin:system_config',
    'admin:audit_logs',
  ],
  super_admin: [
    'emergency:sos',
    'emergency:view',
    'challan:calculate',
    'challan:view_history',
    'report:submit',
    'report:view',
    'report:resolve',
    'tracking:start',
    'tracking:view',
    'profile:view',
    'profile:edit',
    'assistant:chat',
    'assistant:offline',
    'settings:view',
    'settings:edit',
    'admin:users_view',
    'admin:users_manage',
    'admin:roles_manage',
    'admin:analytics_view',
    'admin:system_config',
    'admin:audit_logs',
  ],
};

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/landing',
  '/privacy',
  '/terms',
  '/emergency-card',
  '/track',
] as const;

const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/admin': ['admin:users_view'],
  '/admin/users': ['admin:users_view'],
  '/admin/roles': ['admin:roles_manage'],
  '/admin/analytics': ['admin:analytics_view'],
  '/admin/settings': ['admin:system_config'],
  '/admin/audit': ['admin:audit_logs'],
  '/officer': ['report:resolve'],
  '/challan': ['challan:calculate'],
  '/report': ['report:submit'],
  '/profile': ['profile:view'],
  '/settings': ['settings:view'],
};

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(user: AuthUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every((p) => user.permissions.includes(p));
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function getRequiredPermissionsForRoute(pathname: string): Permission[] | null {
  const matched = Object.entries(ROUTE_PERMISSIONS).find(([route]) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
  return matched ? matched[1] : null;
}

export function canAccessRoute(user: AuthUser | null, pathname: string): boolean {
  if (isPublicRoute(pathname)) return true;
  const required = getRequiredPermissionsForRoute(pathname);
  if (!required) return true;
  return hasAllPermissions(user, required);
}
