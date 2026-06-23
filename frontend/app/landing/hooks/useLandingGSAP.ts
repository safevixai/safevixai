// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

interface ScrollRevealOptions {
  y?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  selector?: string;
}

export function useScrollReveal({
  y = 40,
  duration = 0.8,
  stagger = 0.1,
  start = 'top 85%',
  selector = '.reveal-item',
}: ScrollRevealOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        gsap.set(containerRef.current.querySelectorAll(selector), { opacity: 1, y: 0 });
        return;
      }

      const items = containerRef.current.querySelectorAll(selector);
      if (items.length === 0) return;

      gsap.fromTo(
        items,
        { opacity: 0, y, willChange: 'transform, opacity' },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease: 'power3.out',
          clearProps: 'willChange',
          scrollTrigger: {
            trigger: containerRef.current,
            start,
            toggleActions: 'play none none none',
          },
        }
      );
    },
    { scope: containerRef }
  );

  return containerRef;
}

export function useCountUp(
  targetValue: number,
  options: { duration?: number; start?: string; suffix?: string; prefix?: string } = {}
) {
  const ref = useRef<HTMLSpanElement>(null);
  const { duration = 2, start = 'top 80%' } = options;

  useGSAP(
    () => {
      if (!ref.current) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        ref.current.textContent = targetValue.toLocaleString('en-IN');
        return;
      }

      const counter = { value: 0 };
      gsap.to(counter, {
        value: targetValue,
        duration,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start,
          toggleActions: 'play none none none',
        },
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = Math.round(counter.value).toLocaleString('en-IN');
          }
        },
      });
    },
    { scope: ref }
  );

  return ref;
}

export function useTextReveal() {
  const ref = useRef<HTMLElement>(null);
  const setupRef = useRef(false);

  useGSAP(
    () => {
      if (!ref.current || setupRef.current) return;
      setupRef.current = true;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const container = ref.current;
      const text = container.textContent || '';
      const words = text.split(' ');

      const wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      container.textContent = '';
      container.appendChild(wordSpan);

      words.forEach((word, i) => {
        const outer = document.createElement('span');
        outer.className = 'inline-block overflow-hidden';
        const inner = document.createElement('span');
        inner.className = 'inline-block landing-word';
        inner.style.transform = 'translateY(110%)';
        inner.style.opacity = '0';
        inner.textContent = word;
        outer.appendChild(inner);
        wordSpan.appendChild(outer);
        if (i < words.length - 1) {
          wordSpan.appendChild(document.createTextNode(' '));
        }
      });

      const wordEls = container.querySelectorAll('.landing-word');
      const tween = gsap.to(wordEls, {
        y: '0%',
        opacity: 1,
        duration: 0.6,
        stagger: 0.04,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        onComplete: () => {
          if (container) {
            container.textContent = text;
          }
        },
      });

      return () => {
        tween.kill();
        if (container) container.textContent = text;
      };
    },
    { scope: ref }
  );

  return ref;
}
