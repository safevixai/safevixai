// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { gsap } from '@/lib/gsap';

interface ParallaxOptions {
  intensity?: number;
  smooth?: number;
}

export function useParallax({ intensity = 0.02, smooth = 0.3 }: ParallaxOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      const parallaxElements = containerRef.current.querySelectorAll<HTMLElement>('[data-parallax]');
      parallaxElements.forEach((el) => {
        const depth = parseFloat(el.dataset.parallax || '1');
        gsap.to(el, {
          x: mouse.current.x * intensity * depth * 100,
          y: mouse.current.y * intensity * depth * 100,
          duration: smooth,
          ease: 'power2.out',
        });
      });
    },
    [intensity, smooth]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return containerRef;
}
