'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { triggerSos } from '@/lib/api';
import { enqueueSOS } from '@/lib/offline-sos-queue';
import { generateSosWhatsAppLink, generateSosSmsLink } from '@/lib/sos-share';
import { startFamilyTracking, beginLocationBroadcast, notifyContactsViaWhatsApp } from '@/lib/live-tracking';
import TopSearch from '@/components/dashboard/TopSearch';
import SystemHeader from '@/components/dashboard/SystemHeader';
import { Loader2, AlertTriangle, Activity, Shield, Heart, Share2, MessageSquare, UserCheck, Edit } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';
import { usePageEntry } from '@/hooks/usePageEntry';
import { useShallow } from 'zustand/react/shallow';
import { track } from '@/lib/analytics';

export default function EmergencyPage() {
 const { userProfile, soundsEnabled } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile, soundsEnabled: s.soundsEnabled })));
 const pageRef = usePageEntry();
 const [holding, setHolding] = useState(false);
 const [holdProgress, setHoldProgress] = useState(0);
 const [activated, setActivated] = useState(false);
 const [gForce, setGForce] = useState(1.0);
 const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
 const [geoError, setGeoError] = useState<string | null>(null);
 const [isOnline, setIsOnline] = useState(true);
 const [waLink, setWaLink] = useState('');
 const [smsLink, setSmsLink] = useState('');
 const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
 const rafRef = useRef<number | null>(null);
 const stopBroadcastRef = useRef<(() => void) | null>(null);

 useEffect(() => {
 document.title = 'SOS Emergency | SafeVixAI';
 setIsOnline(navigator.onLine);
 const up = () => setIsOnline(true);
 const dn = () => setIsOnline(false);
 window.addEventListener('online', up);
 window.addEventListener('offline', dn);

 if (navigator.geolocation) {
 navigator.geolocation.getCurrentPosition(
 p => {
 setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
 setGeoError(null);
 },
 err => setGeoError(err.message)
 );
 } else {
 setGeoError('Geolocation not supported by this browser.');
 }

 const handler = (e: DeviceMotionEvent) => {
 const a = e.accelerationIncludingGravity;
 if (!a) return;
 const g = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2) / 9.81;
 setGForce(Math.round(g * 10) / 10);
 };
 const MotionEventCtor = typeof DeviceMotionEvent === 'undefined'
 ? null
 : DeviceMotionEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
 const canAttachMotionListener = !MotionEventCtor?.requestPermission;
 if (canAttachMotionListener) {
 window.addEventListener('devicemotion', handler);
 }
 return () => {
 window.removeEventListener('online', up);
 window.removeEventListener('offline', dn);
 if (canAttachMotionListener) {
 window.removeEventListener('devicemotion', handler);
 }
 if (rafRef.current) cancelAnimationFrame(rafRef.current);
 };
 }, []);

 const startHold = () => {
 if (activated) return;
 setHolding(true);
 setHoldProgress(0);
 haptics.medium();

 const startTime = performance.now();
 const duration = 2000; // 2 seconds

 const animate = (time: number) => {
 const elapsed = time - startTime;
 const progress = Math.min((elapsed / duration) * 100, 100);
 setHoldProgress(progress);

 if (progress < 100) {
 rafRef.current = requestAnimationFrame(animate);
 } else {
 setHolding(false);
 setActivated(true);
 haptics.sos();
 if (soundsEnabled) sounds.sosSent();
 if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
 }
 };
 rafRef.current = requestAnimationFrame(animate);
 };

 const cancelHold = () => {
 if (rafRef.current) cancelAnimationFrame(rafRef.current);
 if (!activated) {
 setHolding(false);
 setHoldProgress(0);
 }
 };

 const [dispatchState, setDispatchState] = useState<'idle' | 'dispatching' | 'dispatched' | 'failed'>('idle');

 const cancelDispatch = () => {
 setActivated(false);
 setHoldProgress(0);
 setDispatchState('idle');
 };

  // Fire backend SOS call on activation + start family tracking
  useEffect(() => {
  if (!activated) return;
  if (!coords) {
  setDispatchState('failed');
  return;
  }

  let cancelled = false;
  setDispatchState('dispatching');

  const dispatchSos = async () => {
  try {
  if (isOnline) {
  await triggerSos({ lat: coords.lat, lon: coords.lng });
  } else {
  await enqueueSOS({ lat: coords.lat, lon: coords.lng });
  }
  if (!cancelled) setDispatchState('dispatched');
  } catch {
  await enqueueSOS({ lat: coords.lat, lon: coords.lng }).catch(() => undefined);
  if (!cancelled) setDispatchState('failed');
  }
  };

  dispatchSos();

  // 2. Start live family tracking session
  if (userProfile?.name) {
  startFamilyTracking({
  userName: userProfile.name,
  bloodGroup: userProfile.bloodGroup || undefined,
  vehicleNumber: userProfile.vehicleNumber || undefined,
  latitude: coords.lat,
  longitude: coords.lng,
  }).then((session) => {
  setTrackingUrl(session.tracking_url);
  // 3. Begin continuous GPS broadcast
  stopBroadcastRef.current = beginLocationBroadcast(session.session_id);
  // 4. Notify emergency contacts via WhatsApp
  const contacts = userProfile.emergencyContact
  ? [userProfile.emergencyContact]
  : [];
  if (contacts.length > 0) {
  notifyContactsViaWhatsApp(contacts, userProfile.name, session.tracking_url);
  }
  }).catch(() => {
  // Tracking failed silently — SOS still works
  });
  }

  return () => {
  cancelled = true;
  stopBroadcastRef.current?.();
  };
  }, [activated, coords, isOnline, userProfile]);

 useEffect(() => {
 const gpsLoc = coords ? { lat: coords.lat, lon: coords.lng, accuracy: 10, timestamp: Date.now() } : null;
 generateSosWhatsAppLink(userProfile, gpsLoc).then(setWaLink).catch(() => setWaLink(''));
 setSmsLink(generateSosSmsLink(userProfile, gpsLoc));
 }, [coords, userProfile]);

 return (
 <div ref={pageRef} className="aurora-glow bg-surface-2 dark:bg-surface-1 text-text-1 dark:text-text-1 font-['Inter'] selection:bg-red-500/30 selection:text-red-900 dark:selection:text-red-950 min-h-dvh flex flex-col relative overflow-x-hidden transition-colors duration-500">
 
 {/* -- Unified Tactical Navigation Header -- */}
 <SystemHeader title="Emergency SOS Terminal" showBack={false} />
 
 <div className="lg:hidden relative z-[100]">
 <TopSearch isMapPage={false} forceShow={true} showBack={false} />
 </div>

 {/* -- Main Tactical HUD Canvas -- */}
 <main className="flex-1 w-full max-w-2xl mx-auto pt-28 lg:pt-24 pb-52 px-6 space-y-8 relative z-10 transition-all duration-500">
 
 {/* -- TOP: SOS PULSING BUTTON -- */}
 <section className="flex flex-col items-center justify-center space-y-6">
 <div className="relative group sos-rings">
 {/* G-Force Badge */}
 <div className="absolute -top-4 -right-4 z-10 bg-white/90 dark:bg-[#2a3548]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-border-md dark:border-[#5b403f]/15 shadow-sm flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-brand-light animate-pulse"></span>
 <span className="text-[10px] font-semibold tracking-widest text-text-1 dark:text-text-1 uppercase">
 {gForce.toFixed(1)}G IMPACT
 </span>
 </div>

 {/* Main SOS Button */}
 <button 
 aria-label={activated ? 'Emergency SOS dispatched' : 'Activate emergency SOS'}
 onPointerDown={startHold}
 onPointerUp={cancelHold}
 onPointerLeave={cancelHold}
 onContextMenu={e => e.preventDefault()}
 className={`relative ${!activated ? '' : ''} w-56 h-56 rounded-full bg-gradient-to-br from-emergency to-red-900 flex flex-col items-center justify-center text-white active:scale-90 transition-transform duration-150 overflow-hidden outline-none focus-premium`}
 style={{
 boxShadow: !activated 
   ? '0 0 60px rgba(220,38,38,0.3), 0 0 120px rgba(220,38,38,0.1), inset 0 -4px 12px rgba(0,0,0,0.3)'
   : '0 0 80px rgba(220,38,38,0.5), 0 0 160px rgba(220,38,38,0.2), inset 0 -4px 12px rgba(0,0,0,0.3)',
 }}
 >
 {/* Hold Progress Background Layer */}
 {holding && !activated && (
 <div 
 className="absolute bottom-0 left-0 right-0 bg-white/20 transition-all duration-75"
 style={{ height: `${holdProgress}%` }}
 />
 )}
 
 <AlertTriangle className="w-16 h-16 mb-2 relative z-10 text-white" />
 <span className="text-3xl font-black tracking-tighter relative z-10">
 {activated ? 'DISPATCHED' : 'SOS'}
 </span>
 </button>
 </div>
 
 <div className="text-center min-h-[80px]">
 {activated ? (
 <div>
 {dispatchState === 'dispatching' && (
 <span className="text-yellow-500 font-black tracking-[0.1em] uppercase text-xs flex items-center justify-center gap-2">
 <Loader2 size={14} className="animate-spin" /> Contacting Emergency Services...
 </span>
 )}
 {dispatchState === 'dispatched' && (
 <>
 <span className="text-brand dark:text-brand-light font-black tracking-[0.1em] uppercase text-xs">Emergency Declared</span>
 <p className="text-brand dark:text-[#e4bebc] text-xs mt-1 font-medium">Nearest emergency services located. Use share links below to send your exact location.</p>
 </>
 )}
 {(dispatchState === 'failed' || dispatchState === 'idle') && (
 <>
 <span className="text-orange-500 font-black tracking-[0.1em] uppercase text-xs">SOS Activated ?? Use Share Links</span>
 <p className="text-text-2 dark:text-[#e4bebc] text-xs mt-1 font-medium">
 {!isOnline ? 'Offline mode ?? share your location via WhatsApp or SMS below.' : 'Backend unreachable ?? share your location manually using the links below.'}
 </p>
 </>
 )}
 <button onClick={cancelDispatch} className="mt-4 px-5 py-2 bg-surface-3 dark:bg-white/10 text-text-1 dark:text-white rounded-full font-bold uppercase text-[10px] tracking-wider hover:bg-surface-3 dark:hover:bg-white/20 transition-colors">
 Cancel Dispatch
 </button>
 {/* Live Tracking Link */}
 {trackingUrl && (
 <div className="mt-4 w-full bg-brand-light/10 dark:bg-brand/10 border border-brand-light/20 dark:border-brand/20 rounded-xl p-3">
 <p className="text-[9px] font-bold uppercase tracking-widest text-brand dark:text-brand-light mb-1">
 Family Live Tracking Active
 </p>
 <p className="text-[10px] text-brand dark:text-brand-light font-semibold break-all">
 {trackingUrl}
 </p>
 <button
 onClick={() => { navigator.clipboard?.writeText(trackingUrl); track.trackingShared('clipboard'); }}
 className="mt-2 text-[9px] font-bold text-brand dark:text-brand-light underline"
 >
 Copy Link
 </button>
 </div>
 )}
 </div>
 ) : (
 <div>
 <span className="text-red-500 dark:text-[#ffb4aa] font-black tracking-[0.1em] uppercase text-xs">Hold to Activate</span>
 <p className="text-text-2 dark:text-[#e4bebc] text-xs mt-1 font-medium">Automatic Emergency Dispatch system armed</p>
 </div>
 )}
 </div>
 </section>

 {/* -- MIDDLE: QUICK DIAL CARDS -- */}
 <section className="grid grid-cols-3 gap-3 stagger-entrance">
 <a href="tel:112" className="card-premium bg-white dark:bg-white/5 border border-border-md dark:border-white/10 shadow-sm p-5 rounded-xl flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all hover:border-red-500/30">
 <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-emergency/15 flex items-center justify-center text-red-600 dark:text-emergency">
 <Activity className="w-6 h-6" />
 </div>
 <div className="text-center">
 <p className="text-[10px] font-semibold tracking-widest text-text-2 uppercase">112</p>
 <p className="text-[10px] font-bold uppercase text-red-600 dark:text-[#ffb4aa]">Emergency</p>
 </div>
 </a>
 
 <a href="tel:100" className="card-premium bg-white dark:bg-white/5 border border-border-md dark:border-white/10 shadow-sm p-5 rounded-xl flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all hover:border-sky-500/30">
 <div className="w-12 h-12 rounded-lg bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-sky-400">
 <Shield className="w-6 h-6" />
 </div>
 <div className="text-center">
 <p className="text-[10px] font-semibold tracking-widest text-text-2 uppercase">100</p>
 <p className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400">Police</p>
 </div>
 </a>

 <a href="tel:102" className="card-premium bg-white dark:bg-white/5 border border-border-md dark:border-white/10 shadow-sm p-5 rounded-xl flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all hover:border-brand-light/30">
 <div className="w-12 h-12 rounded-lg bg-brand-light/15 dark:bg-[#05b046]/15 flex items-center justify-center text-brand dark:text-[#05b046]">
 <Heart className="w-6 h-6" />
 </div>
 <div className="text-center">
 <p className="text-[10px] font-semibold tracking-widest text-text-2 uppercase">102</p>
 <p className="text-[10px] font-bold uppercase text-brand dark:text-brand-light">Ambulance</p>
 </div>
 </a>
 </section>

 {/* -- SECTION: SHARE LOCATION -- */}
 <section className="space-y-4">
 <div className="flex justify-between items-end">
 <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-2 font-space px-2">Share Location</h2>
 <span className="text-[9px] font-bold text-brand dark:text-brand-light uppercase tracking-widest bg-brand-light/15 dark:bg-brand-light/10 px-2.5 py-1 rounded-full">
 Real-time Fix
 </span>
 </div>

 <div className="glass-panel rounded-xl p-6 space-y-6">
 <div className="flex items-start gap-4">
 <div className="flex-1 space-y-1">
 <p className="text-text-2 dark:text-[#e4bebc] text-[10px] font-semibold uppercase tracking-widest">GPS Coordinates Preview</p>
 <div className="text-lg font-mono font-bold tracking-tight text-text-1 dark:text-text-1">
 {geoError ? (
 <span className="text-red-500 dark:text-red-400 text-sm">{geoError}</span>
 ) : coords ? (
 `Lat: ${coords.lat.toFixed(4)}, Long: ${coords.lng.toFixed(4)}`
 ) : (
 <span className="flex items-center gap-2 text-text-2">
 <Loader2 size={16} className="animate-spin" /> Resolving GPS...
 </span>
 )}
 </div>
 </div>
 <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-3 dark:bg-[#2a3548] flex-shrink-0 relative">
 <Image 
 className="object-cover grayscale opacity-50" 
 alt="Map" 
 src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxWfyjGCG1gokyFVyuNR3r3F3sIyjrxuOfSXC3e_I_RTY919UFsdJPbMzQ7GKb38btRBgMPfq7ZCNBEOYu1kN7MrpUfudNwoY_G_lSV8SWbmWGsqAYRVuCpG4aFFbWJqDnimCDoj5CZF5VHdB07tke6yTdrZFtbQb6NiEGlKFHNyHjVjhOBXGtoBl9SwNT_izOAE-ijZ0pJsbmTMg7hkyfUB7yKre1vWVPByMzreduHY6ZjER15dALHvqGJtucwXewQU_gLTiiuoqg"
 fill
 priority
 unoptimized
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => track.trackingShared('whatsapp')} className="flex items-center justify-center gap-2 bg-[#05b046] text-white py-4 rounded-lg font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-md shadow-[#05b046]/20">
 <Share2 className="w-4 h-4" />
 WhatsApp
 </a>
 <a href={smsLink} onClick={() => track.trackingShared('sms')} className="flex items-center justify-center gap-2 bg-surface-2 dark:bg-white/5 text-text-1 dark:text-text-1 py-4 rounded-lg font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all border border-border-md dark:border-white/10 shadow-sm">
 <MessageSquare className="w-4 h-4" />
 SMS Backup
 </a>
 </div>
 </div>
 </section>

 {/* -- CARD: CRASH PROFILE -- */}
 <section className="space-y-4">
 <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-2 font-space px-2">Crash Profile</h2>
 <div className="scan-line-overlay bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-xl p-6 border border-border-md dark:border-white/10 shadow-sm relative overflow-hidden">
 {/* Decorative background elements */}
 <div className="absolute -bottom-4 -right-4 opacity-[0.03] dark:opacity-5 rotate-12">
 <UserCheck className="w-32 h-32 text-text-3" />
 </div>
 
 <div className="grid grid-cols-2 gap-y-6 gap-x-4 relative z-10">
 <div>
 <p className="text-text-2 dark:text-[#e4bebc] text-[10px] font-semibold uppercase tracking-widest mb-1">Blood Group</p>
 <p className="text-xl font-black text-red-600 dark:text-[#ffb4aa]">
 {userProfile.bloodGroup || <span className="text-text-2 text-sm font-bold normal-case">Not set ?? add in Profile</span>}
 </p>
 </div>
 <div>
 <p className="text-text-2 dark:text-[#e4bebc] text-[10px] font-semibold uppercase tracking-widest mb-1">Primary Contact</p>
 <p className="text-lg font-bold text-text-1 dark:text-text-1 truncate">
 {userProfile.emergencyContact || <span className="text-text-2 text-sm font-bold normal-case">Not set</span>}
 </p>
 </div>
 <div>
 <p className="text-text-2 dark:text-[#e4bebc] text-[10px] font-semibold uppercase tracking-widest mb-1">Vehicle ID</p>
 <p className="text-base font-mono font-bold text-brand dark:text-brand-light">
 {userProfile.vehicleNumber || <span className="text-text-2 text-sm font-bold font-sans normal-case">Not set</span>}
 </p>
 </div>
 <div>
 <p className="text-text-2 dark:text-[#e4bebc] text-[10px] font-semibold uppercase tracking-widest mb-1">Operator</p>
 <p className="text-sm font-bold text-text-1 dark:text-text-1">
 {userProfile.name || <span className="text-text-2 italic">Set name in Profile</span>}
 </p>
 </div>
 </div>
 {/* Prompt to fill profile if empty */}
 {!userProfile.name && !userProfile.bloodGroup && (
 <a href="/profile" className="mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-brand dark:text-brand-light hover:underline">
 <Edit className="w-3.5 h-3.5" />
 Complete your profile for accurate SOS dispatch
 </a>
 )}
 </div>
 </section>
 </main>
 </div>
 );
}
