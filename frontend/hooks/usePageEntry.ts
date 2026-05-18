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

      // Stagger children in from bottom - fast, professional
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: 'power2.out',
        }
      );
    },
    { scope: containerRef }
  );

  return containerRef;
}
