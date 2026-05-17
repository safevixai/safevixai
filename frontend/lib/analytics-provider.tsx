'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { logClientWarning } from './client-logger'

export const ANALYTICS_CONSENT_KEY = 'safevixai:analytics-consent'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
    const consent = window.localStorage.getItem(ANALYTICS_CONSENT_KEY)

    if (consent !== 'granted') {
      posthog.opt_out_capturing()
      return
    }

    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: false,
        disable_session_recording: true,
      })
      return
    }

    logClientWarning('PostHog is not initialized (NEXT_PUBLIC_POSTHOG_KEY missing)')
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
