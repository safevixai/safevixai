import type { Permission } from './auth/roles';

export interface RouteConfig {
  path: string;
  title: string;
  description: string;
  showInNav: boolean;
  showGlobalSOS: boolean;
  requiresAuth: boolean;
  requiredPermissions?: Permission[];
  navGroup?: 'main' | 'emergency' | 'admin' | 'auth';
  locale?: boolean;
}

export const ROUTES: RouteConfig[] = [
  { path: '/', title: 'Dashboard', description: 'SafeVixAI Dashboard - AI-Powered Road Safety', showInNav: true, showGlobalSOS: false, requiresAuth: true, navGroup: 'main' },
  { path: '/assistant', title: 'AI Assistant', description: 'SafeVixAI Chatbot - Traffic Laws, First Aid & Emergency Help', showInNav: true, showGlobalSOS: true, requiresAuth: true, navGroup: 'main' },
  { path: '/bystander', title: 'Bystander Mode', description: 'SafeVixAI Bystander - Witness Reports & Emergency Help', showInNav: false, showGlobalSOS: true, requiresAuth: false, navGroup: 'emergency' },
  { path: '/challan', title: 'Challan Calculator', description: 'SafeVixAI Challan Calculator - Traffic Fine Estimator', showInNav: true, showGlobalSOS: false, requiresAuth: true, navGroup: 'main' },
  { path: '/command-center', title: 'Command Center', description: 'SafeVixAI Command Center - Emergency Operations Dashboard', showInNav: true, showGlobalSOS: true, requiresAuth: true, requiredPermissions: ['admin:analytics_view'], navGroup: 'admin' },
  { path: '/emergency', title: 'Emergency', description: 'SafeVixAI Emergency Services - Hospitals, Police & Ambulance', showInNav: true, showGlobalSOS: false, requiresAuth: false, navGroup: 'emergency' },
  { path: '/first-aid', title: 'First Aid', description: 'SafeVixAI First Aid Guide - Emergency Medical Procedures', showInNav: true, showGlobalSOS: false, requiresAuth: false, navGroup: 'emergency' },
  { path: '/forgot-password', title: 'Forgot Password', description: 'Reset Your SafeVixAI Password', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'auth' },
  { path: '/guide', title: 'Guide', description: 'SafeVixAI User Guide & Documentation', showInNav: false, showGlobalSOS: true, requiresAuth: false, navGroup: 'main' },
  { path: '/landing', title: 'SafeVixAI', description: 'SafeVixAI - AI-Powered Road Safety Platform', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'auth' },
  { path: '/locator', title: 'Emergency Locator', description: 'SafeVixAI Locator - Find Hospitals, Police & Emergency Services', showInNav: true, showGlobalSOS: true, requiresAuth: true, navGroup: 'emergency' },
  { path: '/login', title: 'Login', description: 'SafeVixAI Login - Sign In to Your Account', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'auth' },
  { path: '/officer', title: 'Officer Dashboard', description: 'SafeVixAI Officer Portal - Traffic Enforcement Dashboard', showInNav: false, showGlobalSOS: true, requiresAuth: true, requiredPermissions: ['report:resolve'], navGroup: 'admin' },
  { path: '/offline', title: 'Offline Mode', description: 'SafeVixAI Offline - Emergency Tools Without Internet', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'emergency' },
  { path: '/privacy', title: 'Privacy Policy', description: 'SafeVixAI Privacy Policy - Data Protection & Security', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'auth' },
  { path: '/profile', title: 'Profile', description: 'SafeVixAI Profile - Emergency Contact & Medical Information', showInNav: true, showGlobalSOS: false, requiresAuth: true, navGroup: 'main' },
  { path: '/report', title: 'Road Report', description: 'SafeVixAI Road Reporter - Report Hazards & Issues', showInNav: true, showGlobalSOS: false, requiresAuth: true, navGroup: 'main' },
  { path: '/reset-password', title: 'Reset Password', description: 'SafeVixAI Password Reset', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'auth' },
  { path: '/settings', title: 'Settings', description: 'SafeVixAI Settings - Preferences & Configuration', showInNav: true, showGlobalSOS: false, requiresAuth: true, navGroup: 'main' },
  { path: '/share-receive', title: 'Share Receive', description: 'SafeVixAI Share - Receive Emergency Information', showInNav: false, showGlobalSOS: true, requiresAuth: false, navGroup: 'emergency' },
  { path: '/signup', title: 'Sign Up', description: 'SafeVixAI Sign Up - Create Your Account', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'auth' },
  { path: '/sos', title: 'SOS Emergency', description: 'SafeVixAI SOS - Emergency Alert System', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'emergency' },
  { path: '/terms', title: 'Terms of Service', description: 'SafeVixAI Terms of Service', showInNav: false, showGlobalSOS: false, requiresAuth: false, navGroup: 'auth' },
  { path: '/tracking', title: 'Live Tracking', description: 'SafeVixAI Family Tracking - Real-time Location Sharing', showInNav: true, showGlobalSOS: true, requiresAuth: true, navGroup: 'emergency' },
];

export function getRouteConfig(pathname: string): RouteConfig | undefined {
  return ROUTES.find((r) => r.path === pathname) || ROUTES.find((r) => pathname.startsWith(r.path + '/'));
}

export function getRouteTitle(pathname: string): string {
  return getRouteConfig(pathname)?.title || 'SafeVixAI';
}

export function getNavRoutes(group?: 'main' | 'emergency' | 'admin' | 'auth'): RouteConfig[] {
  let routes = ROUTES.filter((r) => r.showInNav);
  if (group) routes = routes.filter((r) => r.navGroup === group);
  return routes;
}

export const SOS_HIDDEN_ROUTES = ROUTES.filter((r) => !r.showGlobalSOS).map((r) => r.path);
