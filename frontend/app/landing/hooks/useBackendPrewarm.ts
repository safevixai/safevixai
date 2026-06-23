// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

'use client';

import { useEffect } from 'react';

/**
 * useBackendPrewarm — fires a single, low-priority health-check request
 * to the FastAPI backend while the user is browsing the landing page.
 *
 * Why:
 * Render.com (and similar PaaS) spin down free-tier services after inactivity.
 * The first real API call (login, SOS, etc.) then hits a 20-40s cold start.
 * By pinging the backend during landing page idle time, the server is warm
 * by the time the user clicks "Login" or "Get Started."
 *
 * Implementation:
 * - Fires after a 2-second delay to avoid competing with above-the-fold assets.
 * - Uses `fetch` with `keepalive: true` and low priority to avoid blocking resources.
 * - The `/api/v1/health` endpoint is a lightweight no-auth ping.
 * - Fails silently — this is a best-effort optimization.
 * - Cleans up the timeout if the component unmounts before firing.
 */
export function useBackendPrewarm() {
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/+$/, '');
    const chatbotUrl = process.env.NEXT_PUBLIC_CHATBOT_URL?.trim()?.replace(/\/+$/, '');

    if (!apiUrl) return;

    // Delay pre-warming to prioritize rendering
    const timer = setTimeout(() => {
      const opts: RequestInit = {
        method: 'GET',
        keepalive: true,
        signal: AbortSignal.timeout(15_000),
        priority: 'low',
      };

      // Warm the main API server
      fetch(`${apiUrl}/api/v1/health`, opts).catch(() => {
        // Fail silently — pre-warming is best-effort
      });

      // Warm the chatbot service if configured separately
      if (chatbotUrl && chatbotUrl !== apiUrl) {
        fetch(`${chatbotUrl}/api/v1/health`, opts).catch(() => {});
      }
    }, 2_000);

    return () => clearTimeout(timer);
  }, []);
}
