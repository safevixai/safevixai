'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getSupabaseBrowserClient } from '@/lib/supabase-auth';
import { useShallow } from 'zustand/react/shallow';
import { useHydrated } from '@/lib/use-hydrated';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const nextPathname = usePathname();
  const hydrated = useHydrated();
  const { isAuthenticated, profileHydrated, setAuth, setUserProfile, setAuthToken } = useAppStore(
    useShallow((s) => ({
      isAuthenticated: s.isAuthenticated,
      profileHydrated: s.profileHydrated,
      setAuth: s.setAuth,
      setUserProfile: s.setUserProfile,
      setAuthToken: s.setAuthToken,
    }))
  );
  const [checking, setChecking] = useState(true);

  // E2E test bypass: when __E2E_SKIP_AUTH__ is set in localStorage, skip auth checks
  const skipAuth = typeof window !== 'undefined' && window.localStorage.getItem('__E2E_SKIP_AUTH__') === 'true';

  const [isPublicRoute, setIsPublicRoute] = useState(false);

  useEffect(() => {
    if (!nextPathname) return;
    const PUBLIC_ROUTES = [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/landing',
      '/privacy',
      '/terms'
    ];
    const pathParts = nextPathname.split('/');
    const SUPPORTED_LOCALES = [
      'en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa', 'ur',
      'ar', 'fr', 'es'
    ];
    const firstSegment = pathParts[1];
    const cleanPathname = SUPPORTED_LOCALES.includes(firstSegment)
      ? '/' + pathParts.slice(2).join('/')
      : nextPathname;

    setIsPublicRoute(PUBLIC_ROUTES.includes(cleanPathname));
  }, [nextPathname]);

  useEffect(() => {
    if (skipAuth || isPublicRoute) return;
    if (!hydrated || !profileHydrated) return;

    async function checkSession() {
      if (isAuthenticated) {
        setChecking(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const name = (session.user.user_metadata?.name as string) || session.user.email || 'Operator';
            setAuth(name, session.access_token);
            setUserProfile({ name });
            setAuthToken(session.access_token);
            setChecking(false);
            return;
          }
        } catch {
          // Supabase not configured — fall through
        }
      }

      router.replace('/landing');
    }

    checkSession();
  }, [isAuthenticated, hydrated, profileHydrated, router, setAuth, setUserProfile, setAuthToken, skipAuth, isPublicRoute]);

  if ((skipAuth && hydrated) || isPublicRoute) {
    return <>{children}</>;
  }

  if (checking && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-light/30 border-t-brand-light rounded-full animate-spin" />
          <span className="text-xs font-mono text-text-3 uppercase tracking-wider">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}