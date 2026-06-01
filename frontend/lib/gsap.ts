// frontend/lib/gsap.ts - ONE file, registered once, imported everywhere
// Based on BSMNT + Thomas Augot Next.js 15 best practices
'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';

// SafeVixAI global defaults & plugins - ALL inside window guard for SSR safety
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  gsap.defaults({
    duration: 0.4,
    ease: 'power2.out',
  });
  CustomEase.create('emergency', 'M0,0 C0.6,0 0.8,1 1,1');     // fast snap
  CustomEase.create('smooth', 'M0,0 C0.25,0.1 0.25,1 1,1');     // smooth settle
  CustomEase.create('bounce', 'M0,0 C0.5,-0.5 0.75,1.5 1,1');   // spring
}

export { gsap, ScrollTrigger };
