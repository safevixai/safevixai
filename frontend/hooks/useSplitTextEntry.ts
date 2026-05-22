// frontend/hooks/useSplitTextEntry.ts
// Character-by-character hero title animation using standard GSAP
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

export function useSplitTextEntry<T extends HTMLElement = HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const originalHTML = ref.current.innerHTML;
      const text = ref.current.textContent || '';
      
      // Wrap each character in a span while preserving visual spaces
      ref.current.innerHTML = text
        .split('')
        .map(char => `<span class="split-char-span inline-block" style="opacity: 0">${char === ' ' ? '&nbsp;' : char}</span>`)
        .join('');

      const chars = ref.current.querySelectorAll('.split-char-span');

      gsap.fromTo(
        chars,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.025,
          delay,
          ease: 'power2.out',
          onComplete: () => {
            // Restore original HTML markup to prevent DOM cluttering
            if (ref.current) {
              ref.current.innerHTML = originalHTML;
            }
          },
        }
      );
    },
    { scope: ref }
  );

  return ref;
}
