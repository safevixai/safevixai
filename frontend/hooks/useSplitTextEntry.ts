// frontend/hooks/useSplitTextEntry.ts
// GSAP SplitText character-by-character hero title animation
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, SplitText } from '@/lib/gsap';

export function useSplitTextEntry<T extends HTMLElement = HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const split = new SplitText(ref.current, { type: 'chars' });
      gsap.fromTo(
        split.chars,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.025,
          delay,
          ease: 'power2.out',
          onComplete: () => split.revert(), // clean up DOM
        }
      );
    },
    { scope: ref }
  );

  return ref;
}
