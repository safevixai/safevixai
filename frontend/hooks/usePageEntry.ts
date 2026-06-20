// frontend/hooks/usePageEntry.ts - applies to every page on mount
// Uses dynamic GSAP import to avoid pulling 50KB bundle into non-animated pages
'use client';

import { useRef, useEffect } from 'react';

export function usePageEntry() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Always set visible first (SSR + reduced-motion fallback)
    for (const child of el.children) {
      (child as HTMLElement).style.opacity = '1';
      (child as HTMLElement).style.transform = 'translateY(0)';
    }

    try {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      // Set initial state for stagger animation
      for (const child of el.children) {
        (child as HTMLElement).style.opacity = '0';
        (child as HTMLElement).style.transform = 'translateY(16px)';
      }

      // Dynamically import GSAP only when needed
      import('@/lib/gsap')
        .then(({ gsap }) => {
          gsap.fromTo(
            el.children,
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
        })
        .catch(() => {
          // GSAP failed to load — children are already visible from the CSS fallback above
          for (const child of el.children) {
            (child as HTMLElement).style.opacity = '1';
            (child as HTMLElement).style.transform = 'translateY(0)';
          }
        });
    } catch {
      // Non-critical — children are already visible
    }
  }, []);

  return containerRef;
}
