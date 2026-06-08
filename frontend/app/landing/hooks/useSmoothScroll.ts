'use client';

import { useEffect, useRef } from 'react';

export function useSmoothScroll() {
  const lenisRef = useRef<InstanceType<typeof import('lenis').default> | null>(null);

  useEffect(() => {
    let raf: number;
    let lenis: InstanceType<typeof import('lenis').default> | null = null;

    async function init() {
      try {
        const Lenis = (await import('lenis')).default;
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');

        lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          touchMultiplier: 2,
        });

        lenisRef.current = lenis;

        lenis.on('scroll', ScrollTrigger.update);

        const update = (time: number) => {
          lenis?.raf(time * 1000);
          raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
      } catch {
        // Lenis not available — native scroll is fine
      }
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      init();
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
}
