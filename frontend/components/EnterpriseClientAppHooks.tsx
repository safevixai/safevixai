'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js'
import { triggerSos } from '@/lib/api'
import { startCrashDetection, stopCrashDetection } from '@/lib/crash-detection'
import { enqueueSOS, registerOfflineSyncListeners } from '@/lib/offline-sos-queue'
import { STANDARD_GRAVITY_MS2 } from '@/lib/safety-constants'
import { useAppStore } from '@/lib/store'
import { getSupabaseBrowserClient } from '@/lib/supabase-auth'
import { PUBLIC_CHATBOT_BASE_URL } from '@/lib/public-env'
import { FEATURES } from '@/lib/features'
import { beginLocationBroadcast, startFamilyTracking } from '@/lib/live-tracking'
import { Loader2 } from 'lucide-react'
import { track } from '@/lib/analytics'
import { loadUserProfileFromIndexedDB, migrateUserProfileFromLocalStorage } from '@/lib/profile-storage'
import i18n from '@/lib/i18n'
import { CrashCountdown } from '@/components/crash/CrashCountdown'
import InstallPrompt from '@/components/InstallPrompt'

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
  const [crashState, setCrashState] = useState<{ force: number; severity: string } | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const stopCrashTrackingRef = useRef<(() => void) | null>(null)

  // Synchronize i18n language with the detected route locale and user preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathParts = window.location.pathname.split('/');
    const pathLocale = pathParts[1];
    const preferred = userProfile.preferredLanguage || 'en';
    
    const SUPPORTED_LOCALES = [
      'en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa', 'ur',
      'ar', 'es', 'fr'
    ];
    const targetLocale = SUPPORTED_LOCALES.includes(pathLocale) ? pathLocale : preferred;
    
    if (i18n.language !== targetLocale) {
      i18n.changeLanguage(targetLocale).then(() => {
        // Sync document text direction and language dynamically on the client
        const isRtl = targetLocale === 'ar' || targetLocale === 'ur';
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = targetLocale;
      });
    }
  }, [userProfile.preferredLanguage]);

  useEffect(() => {
    registerOfflineSyncListeners()

    // Register Service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            if (process.env.NODE_ENV !== 'production') console.log('SafeVixAI: ServiceWorker registered successfully:', reg.scope);
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

    // iOS 13+ requires user gesture to request motion permission on every session load.
    const isIOS = typeof window !== 'undefined' && 
      typeof DeviceMotionEvent !== 'undefined' && 
      typeof (DeviceMotionEvent as any).requestPermission === 'function';

    if (isIOS) {
      toast.info(
        "iOS Motion Sensors: Action required to enable automatic crash detection.",
        {
          position: "top-center",
          duration: 12000,
          action: {
            label: "Authorize",
            onClick: async () => {
              const { requestCrashPermission } = await import('@/lib/crash-detection');
              const granted = await requestCrashPermission();
              if (granted) {
                toast.success("Motion sensors authorized successfully!");
              } else {
                toast.error("Permission denied. Crash detection disabled.");
                useAppStore.getState().setCrashDetectionEnabled(false);
              }
            }
          }
        }
      );
    }

    const handleCrashDetected = (force: number) => {
      const gForce = force / STANDARD_GRAVITY_MS2
      const severity = gForce >= 15 ? 'severe' : gForce >= 10 ? 'moderate' : 'minor'
      track.crashDetected('impact', gForce)
      setCrashState({ force, severity })
    }

    void startCrashDetection(handleCrashDetected)
    return () => stopCrashDetection(handleCrashDetected)
  }, [crashDetectionEnabled])

  const handleDispatchSos = async () => {
    if (dispatching) return
    if (!gpsLocation) {
      toast.error('Crash detected, but location is unavailable. Open SOS and share your location manually.', {
        duration: 0,
        position: 'top-center',
      })
      setCrashState(null)
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
      setCrashState(null)
    }
  }

  return (
    <>
      <SystemBanners />
      {crashState && (
        <CrashCountdown
          severity={crashState.severity}
          onCancel={() => {
            track.crashCancelled(0)
            setCrashState(null)
          }}
          onDispatch={handleDispatchSos}
        />
      )}
      <InstallPrompt />
    </>
  )
}
