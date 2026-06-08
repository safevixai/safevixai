'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getSupabaseBrowserClient } from '@/lib/supabase-auth';
import { useShallow } from 'zustand/react/shallow';
import { useHydrated } from '@/lib/use-hydrated';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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

  useEffect(() => {
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

      router.replace('/login');
    }

    checkSession();
  }, [isAuthenticated, hydrated, profileHydrated, router, setAuth, setUserProfile, setAuthToken]);

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