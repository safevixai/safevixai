'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';
import SystemSidebar from '@/components/dashboard/SystemSidebar';
import BottomNav from '@/components/dashboard/BottomNav';
import { NetworkMonitor } from '@/components/NetworkMonitor';
import { GlobalSOS } from '@/components/GlobalSOS';
import { useAppStore } from '@/lib/store';

interface AppFrameProps {
  children: ReactNode;
}

export function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();
  const isDesktopSidebarCollapsed = useAppStore((state) => state.isDesktopSidebarCollapsed);

  // Define routes that should NOT have the global navigation shell (e.g. auth, public emergency views)
  const NO_NAV_ROUTES = ['/login', '/bystander', '/emergency-card', '/share-receive', '/track'];
  
  // Check if current path matches or starts with a no-nav route
  const isNoNavRoute = NO_NAV_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isNoNavRoute) {
    return (
      <div className="flex min-h-dvh w-full bg-[#0A0E14] text-white transition-colors duration-300">
        <NetworkMonitor />
        {/* Intentionally omitting GlobalSOS, Sidebar, and BottomNav for these standalone pages */}
        <main className="flex-1 w-full relative flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {/* ── Skip Link for Accessibility ── */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 p-2 bg-[var(--bg-card)] text-[var(--text-primary)] font-bold rounded">
        Skip to main content
      </a>

      {/* ── Global Utilities ── */}
      <NetworkMonitor />
      <GlobalSOS />

      {/* ── Navigation Shell ── */}
      
      {/* 1. Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* 2. Mobile Sidebar Drawer */}
      <SystemSidebar />

      {/* ── Main Content Area ── */}
      <main 
        id="main" 
        className={`flex-1 relative flex flex-col min-h-dvh w-full transition-all duration-300 pb-20 lg:pb-0 ${
          isDesktopSidebarCollapsed ? 'lg:ml-[88px]' : 'lg:ml-[280px]'
        }`}
      >
        <div className="relative flex-1 w-full flex flex-col">
          {children}
        </div>
      </main>

      {/* 3. Mobile Bottom Navigation */}
      <div className="lg:hidden z-40 relative">
        <BottomNav />
      </div>
    </div>
  );
}
