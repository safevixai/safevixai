'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

let SplitText: any = null;

async function loadSplitText() {
  if (typeof window === 'undefined') return;
  try {
    const mod = await import('gsap/SplitText');
    SplitText = mod.SplitText;
    gsap.registerPlugin(mod.SplitText);
  } catch {
    // commercial plugin is unavailable; standard DOM fallback is leveraged
  }
}

if (typeof window !== 'undefined') {
  loadSplitText();
}

export function useSplitTextEntry() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!headingRef.current) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const originalHTML = headingRef.current.innerHTML;

      if (SplitText) {
        const split = new SplitText(headingRef.current, {
          type: 'chars',
          charsClass: 'split-char',
        });

        gsap.fromTo(
          split.chars,
          { opacity: 0, y: 12, willChange: 'transform, opacity' },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.025,
            ease: 'power2.out',
            clearProps: 'willChange',
            onComplete: () => {
              if (headingRef.current) {
                headingRef.current.innerHTML = originalHTML;
              }
            },
          }
        );
      } else {
        // High-performance pure DOM/CSS fallback for standard GSAP SplitText
        const text = headingRef.current.textContent || '';
        headingRef.current.innerHTML = text
          .split('')
          .map(
            (char) =>
              `<span class="split-char inline-block" style="opacity: 0; will-change: transform, opacity;">${
                char === ' ' ? '&nbsp;' : char
              }</span>`
          )
          .join('');

        const chars = headingRef.current.querySelectorAll('.split-char');
        gsap.fromTo(
          chars,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.025,
            ease: 'power2.out',
            clearProps: 'all',
            onComplete: () => {
              if (headingRef.current) {
                headingRef.current.innerHTML = originalHTML;
              }
            },
          }
        );
      }
    },
    { scope: headingRef }
  );

  return headingRef;
}
