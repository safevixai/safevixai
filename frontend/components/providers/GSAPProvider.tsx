// frontend/components/providers/GSAPProvider.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, ScrollTrigger } from '@/lib/gsap';

export function GSAPProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Kill all ScrollTriggers on route change - prevents memory leaks
  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [pathname]);

  // Respect prefers-reduced-motion - WCAG requirement
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      gsap.globalTimeline.timeScale(1000); // instant - no animation
    }
    const handler = (e: MediaQueryListEvent) => {
      gsap.globalTimeline.timeScale(e.matches ? 1000 : 1);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return <>{children}</>;
}
