// frontend/components/chat/TypingIndicator.tsx
// 3-dot bouncing typing indicator with GSAP animation
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

export function TypingIndicator() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const dots = ref.current?.querySelectorAll('.typing-dot');
      if (!dots?.length) return;

      gsap.to(dots, {
        y: -4,
        duration: 0.3,
        stagger: 0.1,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className="flex gap-1 px-4 py-3 rounded-2xl w-fit"
      style={{ background: 'var(--surface-2)' }}
      aria-label="AI is typing"
    >
      <span
        className="typing-dot"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--text-3)',
        }}
      />
      <span
        className="typing-dot"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--text-3)',
        }}
      />
      <span
        className="typing-dot"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--text-3)',
        }}
      />
    </div>
  );
}
