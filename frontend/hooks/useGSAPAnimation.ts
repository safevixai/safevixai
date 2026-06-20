// frontend/hooks/useGSAPAnimation.ts
// Based on Thomas Augot's Next.js 15 optimization pattern
'use client';

import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from '@/lib/gsap';
import { RefObject } from 'react';

interface AnimationConfig {
  ref: RefObject<HTMLElement | null>;
  animation: (el: HTMLElement) => void;
  deps?: unknown[];
  delay?: number;
}

export function useGSAPAnimation({
  ref,
  animation,
  deps = [],
  delay = 0,
}: AnimationConfig) {
  useGSAP(
    () => {
      if (!ref.current) return;

      const timer = setTimeout(() => {
        animation(ref.current!);
        ScrollTrigger.refresh();
      }, delay);

      return () => clearTimeout(timer);
    },
    { scope: ref, dependencies: deps }
  );
}

// Performance rule: ONLY animate GPU-accelerated properties:
// ✅ transform (x, y, scale, rotation)  - GPU composited
// ✅ opacity                              - GPU composited
// ❌ width, height, top, left, margin    - triggers layout reflow
// ❌ background-color (use opacity fade) - triggers paint
// ❌ border-radius animation             - triggers paint
