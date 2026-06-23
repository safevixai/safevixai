// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

// frontend/lib/analytics.ts — Typed PostHog event tracking
// Centralized event definitions for SafeVixAI business metrics
// PostHog client is lazily set via initAnalyticsClient() after GDPR opt-in

let _posthogClient: any = null;

export function initAnalyticsClient(ph: any) {
  _posthogClient = ph;
}

function safeCapture(event: string, properties?: Record<string, any>) {
  if (!_posthogClient) return;
  try {
    _posthogClient.capture(event, properties);
  } catch {
    // Analytics failure must never interrupt app flow
  }
}

/**
 * Typed analytics events for SafeVixAI.
 * All events are namespaced and typed to prevent typos and ensure
 * consistent event naming across the codebase.
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track.sosActivated('crash_detection');
 *
 * Note: Events are only sent after user GDPR opt-in.
 */
export const track = {
  /** SOS was activated (by crash detection, manual button, or voice) */
  sosActivated: (method: 'crash_detection' | 'manual' | 'voice' | 'shake') =>
    safeCapture('sos_activated', { method }),

  /** Crash detected by DeviceMotion accelerometer */
  crashDetected: (severity: string, gForce?: number) =>
    safeCapture('crash_detected', { severity, g_force: gForce }),

  /** Crash countdown was cancelled by user (they're safe) */
  crashCancelled: (secondsRemaining: number) =>
    safeCapture('crash_cancelled', { seconds_remaining: secondsRemaining }),

  /** Hospital/service locator returned results */
  hospitalFound: (count: number, radiusKm: number, filter?: string) =>
    safeCapture('hospital_found', { count, radius_km: radiusKm, filter }),

  /** Challan fine was calculated */
  challanCalculated: (state: string, section: string, amount: number, isRepeat: boolean) =>
    safeCapture('challan_calculated', { state, section, amount, is_repeat: isRepeat }),

  /** Road hazard report was submitted */
  reportSubmitted: (issueType: string, hasPhoto: boolean, isOffline: boolean) =>
    safeCapture('report_submitted', { issue_type: issueType, has_photo: hasPhoto, is_offline: isOffline }),

  /** AI chatbot was queried */
  chatbotQueried: (intent?: string, provider?: string) =>
    safeCapture('chatbot_queried', { intent, provider }),

  /** User completed their safety profile */
  profileCompleted: () =>
    safeCapture('profile_completed'),

  /** SOS was queued for offline replay */
  offlineSosQueued: () =>
    safeCapture('offline_sos_queued'),

  /** Family tracking link was shared */
  trackingShared: (method: 'sms' | 'whatsapp' | 'clipboard' | 'web_share') =>
    safeCapture('tracking_shared', { method }),

  /** Emergency number was called */
  emergencyCallMade: (number: string) =>
    safeCapture('emergency_call_made', { number }),

  /** First aid guide was viewed */
  firstAidViewed: (guideId: string) =>
    safeCapture('first_aid_viewed', { guide_id: guideId }),

  /** QR emergency card was shared or downloaded */
  qrCardAction: (action: 'share' | 'download' | 'preview') =>
    safeCapture('qr_card_action', { action }),

  /** Page was viewed (use sparingly — PostHog auto-tracks pageviews) */
  pageViewed: (page: string) =>
    safeCapture('$pageview', { page }),

  /** Feature flag or integration error */
  integrationError: (source: string, error: string) =>
    safeCapture('integration_error', { source, error }),

  /** Navigation timing: page load performance metrics from Performance API */
  pageLoadTiming: () => {
    if (typeof window === 'undefined' || !window.performance?.timing) return;
    const t = window.performance.timing;
    const navStart = t.navigationStart || t.fetchStart || 0;
    if (!navStart) return;
    safeCapture('page_load_timing', {
      dns_ms: t.domainLookupEnd - t.domainLookupStart,
      tcp_ms: t.connectEnd - t.connectStart,
      ttfb_ms: t.responseStart - navStart,
      dom_ready_ms: t.domContentLoadedEventEnd - navStart,
      full_load_ms: t.loadEventEnd - navStart,
      redirect_ms: t.redirectEnd - t.redirectStart,
    });
  },
};
