'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js'
import { triggerSos } from '@/lib/api'
import { startCrashDetection, stopCrashDetection } from '@/lib/crash-detection'
import { enqueueSOS, registerOfflineSyncListeners } from '@/lib/offline-sos-queue'
import { CRASH_COUNTDOWN_SECONDS, STANDARD_GRAVITY_MS2 } from '@/lib/safety-constants'
import { useAppStore } from '@/lib/store'
import { getSupabaseBrowserClient } from '@/lib/supabase-auth'
import { PUBLIC_CHATBOT_BASE_URL } from '@/lib/public-env'
import { FEATURES } from '@/lib/features'
import { beginLocationBroadcast, startFamilyTracking } from '@/lib/live-tracking'
import { Loader2 } from 'lucide-react'
import { track } from '@/lib/analytics'
import { loadUserProfileFromIndexedDB, migrateUserProfileFromLocalStorage } from '@/lib/profile-storage'

function SystemBanners() {
  const connectivity = useAppStore(state => state.connectivity)
  const [warming, setWarming] = useState(false)

  useEffect(() => {
    // Check if backend needs warming up (e.g., cold starts)
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout means it's likely waking up
        
        const res = await fetch(`${PUBLIC_CHATBOT_BASE_URL}/speech/status`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Not ready');
        setWarming(false);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setWarming(true);
          // Wait a bit and it will likely be up. In a real scenario we'd poll.
        }
      }
    };
    checkHealth();
  }, []);

  return (
    <>
      {warming && connectivity !== 'offline' && (
        <div className="fixed top-0 left-0 w-full z-[9999] bg-brand text-white text-xs font-bold px-4 py-1.5 flex items-center justify-center gap-2 shadow-md">
          <Loader2 size={14} className="animate-spin" />
          CONNECTING... (~30 SECONDS ON FIRST LOAD)
        </div>
      )}
    </>
  )
}

export function EnterpriseClientAppHooks() {
  const { crashDetectionEnabled, gpsLocation, userProfile } = useAppStore((state) => ({
    crashDetectionEnabled: state.crashDetectionEnabled,
    gpsLocation: state.gpsLocation,
    userProfile: state.userProfile,
  }))
  const [crashCountdown, setCrashCountdown] = useState<{ force: number; remaining: number } | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const stopCrashTrackingRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    registerOfflineSyncListeners()

    // Register Service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('SafeVixAI: ServiceWorker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.error('SafeVixAI: ServiceWorker registration failed:', err);
          });
      };
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker, { once: true });
      }
    }

    return () => {
      stopCrashTrackingRef.current?.()
      stopCrashTrackingRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const hydrateProfile = async () => {
      await migrateUserProfileFromLocalStorage()
      const profile = await loadUserProfileFromIndexedDB()
      if (!cancelled && profile) {
        useAppStore.getState().setUserProfile(profile)
      }
    }
    void hydrateProfile()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    const syncSession = (session: Session | null) => {
      const store = useAppStore.getState()
      if (!session?.access_token) {
        store.clearAuth()
        return
      }
      const displayName =
        (session.user.user_metadata?.name as string | undefined) ||
        session.user.email ||
        'SafeVixAI User'
      store.setAuth(displayName)
      store.setUserProfile({ name: displayName })
    }

    void supabase.auth.getSession().then(({ data }) => syncSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!FEATURES.crashDetection || !crashDetectionEnabled) return
    const handleCrashDetected = (force: number) => {
      track.crashDetected('impact', force / STANDARD_GRAVITY_MS2)
      setCrashCountdown({ force, remaining: CRASH_COUNTDOWN_SECONDS })
    }

    void startCrashDetection(handleCrashDetected)
    return () => stopCrashDetection(handleCrashDetected)
  }, [crashDetectionEnabled])

  useEffect(() => {
    if (!crashCountdown || dispatching) return
    if (crashCountdown.remaining <= 0) {
      const dispatchSos = async () => {
        if (!gpsLocation) {
          toast.error('Crash detected, but location is unavailable. Open SOS and share your location manually.', {
            duration: 0,
            position: 'top-center',
          })
          setCrashCountdown(null)
          return
        }

        setDispatching(true)
        try {
          track.sosActivated('crash_detection')
          await triggerSos({ lat: gpsLocation.lat, lon: gpsLocation.lon })
          if (userProfile.name.trim()) {
            try {
              const trackingSession = await startFamilyTracking({
                userName: userProfile.name,
                bloodGroup: userProfile.bloodGroup || undefined,
                vehicleNumber: userProfile.vehicleNumber || undefined,
                latitude: gpsLocation.lat,
                longitude: gpsLocation.lon,
              })
              stopCrashTrackingRef.current?.()
              stopCrashTrackingRef.current = beginLocationBroadcast(trackingSession.session_id)
              toast.success(`Family tracking started: ${trackingSession.tracking_url}`, {
                duration: 0,
                position: 'top-center',
              })
            } catch {
              toast.error('Auto-SOS sent, but family tracking could not be started. Open SOS to share manually.', {
                duration: 0,
                position: 'top-center',
              })
            }
          }
          toast.success('SOS sent to emergency contacts - they can track you now.', {
            duration: 0,
            position: 'top-center',
          })
        } catch {
          track.offlineSosQueued()
          await enqueueSOS({ lat: gpsLocation.lat, lon: gpsLocation.lon })
          toast.error('Network unavailable - SOS saved offline and will retry automatically.', {
            duration: 0,
            position: 'top-center',
          })
        } finally {
          setDispatching(false)
          setCrashCountdown(null)
        }
      }
      void dispatchSos()
      return
    }

    const timeout = window.setTimeout(() => {
      setCrashCountdown((current) =>
        current ? { ...current, remaining: current.remaining - 1 } : current
      )
    }, 1000)
    return () => window.clearTimeout(timeout)
  }, [crashCountdown, dispatching, gpsLocation, userProfile])

  if (!crashCountdown) return <SystemBanners />

  return (
    <>
      <SystemBanners />
      <CrashDialog
        crashCountdown={crashCountdown}
        onCancel={() => {
          track.crashCancelled(crashCountdown.remaining)
          setCrashCountdown(null)
        }}
        onSendNow={() => setCrashCountdown((current) => current && { ...current, remaining: 0 })}
      />
    </>
  )
}

// F14: Focus trap for crash dialog — keeps keyboard focus inside the alertdialog
// and restores it to the previously focused element when dismissed.
function CrashDialog({
  crashCountdown,
  onCancel,
  onSendNow,
}: {
  crashCountdown: { force: number; remaining: number }
  onCancel: () => void
  onSendNow: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [])

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-x-4 top-4 z-[1000] mx-auto max-w-md rounded-xl border border-red-500/40 bg-red-950/95 p-4 text-white shadow-2xl outline-none"
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="crash-countdown-title"
      aria-describedby="crash-countdown-desc"
      aria-modal="true"
    >
      <div className="flex flex-col gap-3">
        <div>
          <p id="crash-countdown-title" className="text-base font-black uppercase tracking-wide">
            Crash Detected
          </p>
          <p id="crash-countdown-desc" className="text-sm text-red-100">
            G-force spike: {(crashCountdown.force / STANDARD_GRAVITY_MS2).toFixed(1)}G
          </p>
        </div>
        <div className="rounded-lg bg-white/10 p-3 text-center">
          <span className="text-4xl font-black tabular-nums">{crashCountdown.remaining}</span>
          <span className="ml-1 text-sm uppercase tracking-widest text-red-100">sec</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="h-11 flex-1 rounded-lg bg-white text-sm font-bold text-red-950"
            onClick={onCancel}
          >
            I am safe - cancel SOS
          </button>
          <button
            type="button"
            className="h-11 flex-1 rounded-lg bg-red-600 text-sm font-bold text-white"
            onClick={onSendNow}
          >
            Send SOS now
          </button>
        </div>
      </div>
    </div>
  )
}
