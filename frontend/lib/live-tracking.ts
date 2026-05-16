// frontend/lib/live-tracking.ts
import { useAppStore } from './store';
import { PUBLIC_API_BASE_URL } from './public-env';
import { LIVE_TRACKING_POLL_INTERVAL_MS } from './safety-constants';
// Enterprise Family Tracking — Supabase Realtime + REST API
// Two modes:
// 1. VICTIM → startFamilyTracking() → GPS polling → PUT /api/v1/live-tracking/update
// 2. FAMILY → subscribeToTracking() → GET /api/v1/live-tracking/session/:id (poll)

const API_BASE = PUBLIC_API_BASE_URL;

type NavigatorWithBattery = Navigator & {
 getBattery?: () => Promise<{ level: number }>;
};

function authHeaders(): HeadersInit {
 const token = useAppStore.getState().authToken;
 return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface TrackingSession {
 session_id: string;
 tracking_url: string;
 expires_at: string;
}

export interface LiveLocation {
 session_id: string;
 user_name: string;
 blood_group: string | null;
 vehicle_number: string | null;
 latitude: number;
 longitude: number;
 accuracy: number | null;
 speed_kmh: number | null;
 battery_percent: number | null;
 is_active: boolean;
 updated_at: string;
}

// ── VICTIM SIDE ──────────────────────────────────────────────────────────────

/**
 * Start a live tracking session and return the shareable family link.
 * Call this immediately when SOS is triggered or crash is detected.
 */
export async function startFamilyTracking(params: {
 userName: string;
 bloodGroup?: string;
 vehicleNumber?: string;
 latitude: number;
 longitude: number;
 batteryPercent?: number;
}): Promise<TrackingSession> {
 const res = await fetch(`${API_BASE}/api/v1/live-tracking/start`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', ...authHeaders() },
 body: JSON.stringify({
  user_name: params.userName,
  blood_group: params.bloodGroup,
  vehicle_number: params.vehicleNumber,
  latitude: params.latitude,
  longitude: params.longitude,
  battery_percent: params.batteryPercent,
 }),
 });

 if (!res.ok) throw new Error('Failed to start tracking session');
 return res.json();
}

/**
 * Begin continuous GPS polling and push location updates to the server.
 * Returns a function to stop tracking.
 *
 * C2 FIX: Detects expired sessions (401/404) and stops broadcasting.
 * Stops after MAX_CONSECUTIVE_FAILURES to prevent infinite battery drain.
 */
export function beginLocationBroadcast(sessionId: string): () => void {
 let active = true;
 let consecutiveFailures = 0;
 const MAX_CONSECUTIVE_FAILURES = 5;

 const push = () => {
  if (!active) return;
  navigator.geolocation.getCurrentPosition(
   async (pos) => {
    const battery = await getBatteryLevel();
    try {
     const res = await fetch(`${API_BASE}/api/v1/live-tracking/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
       session_id: sessionId,
       latitude: pos.coords.latitude,
       longitude: pos.coords.longitude,
       accuracy: pos.coords.accuracy,
       speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
       battery_percent: battery,
      }),
     });
     if (res.ok) {
      consecutiveFailures = 0;
     } else if (res.status === 401 || res.status === 404) {
      // Session expired or invalid — stop broadcasting to save battery
      active = false;
      clearInterval(interval);
      return;
     } else {
      consecutiveFailures += 1;
     }
    } catch {
     // Network error — increment failure counter but keep trying
     consecutiveFailures += 1;
    }
    // Stop broadcasting after too many consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
     active = false;
     clearInterval(interval);
    }
   },
   () => {},
   { enableHighAccuracy: true },
  );
 };

 push(); // Immediate first push
 const interval = setInterval(push, LIVE_TRACKING_POLL_INTERVAL_MS);

 return () => {
  active = false;
  clearInterval(interval);
 };
}

/**
 * Stop a tracking session (user confirmed safe).
 */
export async function stopFamilyTracking(sessionId: string): Promise<void> {
 await fetch(`${API_BASE}/api/v1/live-tracking/session/${sessionId}`, {
  method: 'DELETE',
  headers: authHeaders(),
 }).catch(() => {});
}

/**
 * Send WhatsApp messages to emergency contacts with the tracking link.
 *
 * H6 FIX: Opens one link at a time to avoid browser popup blocking.
 * Uses the first contact immediately (user-initiated), queues the rest.
 */
export function notifyContactsViaWhatsApp(
 contacts: string[],
 userName: string,
 trackingUrl: string,
): void {
 const message = encodeURIComponent(
  ` EMERGENCY ALERT\n${userName} needs help!\n\nTrack live location:\n${trackingUrl}\n\n(Link works for 4 hours, no app needed)`,
 );

 if (contacts.length === 0) return;

 // Open the first contact immediately (user-gesture context allows this)
 const cleaned0 = contacts[0].replace(/[\s\-()]/g, '');
 window.open(`https://wa.me/${cleaned0}?text=${message}`, '_blank');

 // Queue remaining contacts with delays to avoid popup blocking
 contacts.slice(1).forEach((phone, index) => {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  setTimeout(() => {
   window.open(`https://wa.me/${cleaned}?text=${message}`, '_blank');
  }, (index + 1) * 1500);
 });
}

// ── FAMILY SIDE ───────────────────────────────────────────────────────────────

/**
 * Poll for a tracking session's current location.
 * Used by family members who open the shared link.
 * Returns a stop function.
 */
export function subscribeToTracking(
 sessionId: string,
 token: string,
 onUpdate: (location: LiveLocation) => void,
 onExpired: () => void,
 intervalMs = LIVE_TRACKING_POLL_INTERVAL_MS,
): () => void {
 let active = true;

 const poll = async () => {
  if (!active) return;
  try {
   const params = new URLSearchParams({ token });
   const res = await fetch(`${API_BASE}/api/v1/live-tracking/session/${sessionId}?${params}`);
   if (res.status === 404) {
    onExpired();
    active = false;
    return;
   }
   if (res.ok) {
    const data: LiveLocation = await res.json();
    if (!data.is_active) {
     onExpired();
     active = false;
     return;
    }
    onUpdate(data);
   }
  } catch {
   // Network error — keep trying silently
  }
 };

 poll(); // Immediate
 const interval = setInterval(poll, intervalMs);

 return () => {
  active = false;
  clearInterval(interval);
 };
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

async function getBatteryLevel(): Promise<number | undefined> {
 try {
  const battery = await (navigator as NavigatorWithBattery).getBattery?.();
  return battery ? Math.round(battery.level * 100) : undefined;
 } catch {
  return undefined;
 }
}
