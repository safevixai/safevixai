// frontend/hooks/usePageEntry.ts - applies to every page on mount
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

export function usePageEntry() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      // P0-08: Accessibility — Respect user's motion preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        gsap.set(containerRef.current.children, { opacity: 1, y: 0 });
        return;
      }

      // Stagger children in from bottom - fast, professional
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 16, willChange: 'transform, opacity' },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: 'power2.out',
          clearProps: 'willChange',
        }
      );
    },
    { scope: containerRef }
  );

  return containerRef;
}
