// frontend/lib/analytics.ts — Typed PostHog event tracking
// Centralized event definitions for SafeVixAI business metrics
import posthog from 'posthog-js';

/**
 * Typed analytics events for SafeVixAI.
 * All events are namespaced and typed to prevent typos and ensure
 * consistent event naming across the codebase.
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track.sosActivated('crash_detection');
 */
export const track = {
  /** SOS was activated (by crash detection, manual button, or voice) */
  sosActivated: (method: 'crash_detection' | 'manual' | 'voice' | 'shake') =>
    posthog.capture('sos_activated', { method }),

  /** Crash detected by DeviceMotion accelerometer */
  crashDetected: (severity: string, gForce?: number) =>
    posthog.capture('crash_detected', { severity, g_force: gForce }),

  /** Crash countdown was cancelled by user (they're safe) */
  crashCancelled: (secondsRemaining: number) =>
    posthog.capture('crash_cancelled', { seconds_remaining: secondsRemaining }),

  /** Hospital/service locator returned results */
  hospitalFound: (count: number, radiusKm: number, filter?: string) =>
    posthog.capture('hospital_found', { count, radius_km: radiusKm, filter }),

  /** Challan fine was calculated */
  challanCalculated: (state: string, section: string, amount: number, isRepeat: boolean) =>
    posthog.capture('challan_calculated', { state, section, amount, is_repeat: isRepeat }),

  /** Road hazard report was submitted */
  reportSubmitted: (issueType: string, hasPhoto: boolean, isOffline: boolean) =>
    posthog.capture('report_submitted', { issue_type: issueType, has_photo: hasPhoto, is_offline: isOffline }),

  /** AI chatbot was queried */
  chatbotQueried: (intent?: string, provider?: string) =>
    posthog.capture('chatbot_queried', { intent, provider }),

  /** User completed their safety profile */
  profileCompleted: () =>
    posthog.capture('profile_completed'),

  /** SOS was queued for offline replay */
  offlineSosQueued: () =>
    posthog.capture('offline_sos_queued'),

  /** Family tracking link was shared */
  trackingShared: (method: 'sms' | 'whatsapp' | 'clipboard' | 'web_share') =>
    posthog.capture('tracking_shared', { method }),

  /** Emergency number was called */
  emergencyCallMade: (number: string) =>
    posthog.capture('emergency_call_made', { number }),

  /** First aid guide was viewed */
  firstAidViewed: (guideId: string) =>
    posthog.capture('first_aid_viewed', { guide_id: guideId }),

  /** QR emergency card was shared or downloaded */
  qrCardAction: (action: 'share' | 'download' | 'preview') =>
    posthog.capture('qr_card_action', { action }),

  /** Page was viewed (use sparingly — PostHog auto-tracks pageviews) */
  pageViewed: (page: string) =>
    posthog.capture('$pageview', { page }),

  /** Feature flag or integration error */
  integrationError: (source: string, error: string) =>
    posthog.capture('integration_error', { source, error }),
};
