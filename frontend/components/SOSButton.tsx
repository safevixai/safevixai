'use client';

import React, { memo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { generateSosWhatsAppLink, generateSosSmsLink } from '@/lib/sos-share';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';
import { useShallow } from 'zustand/react/shallow';

/**
 * SOSButton — Pulsative Tactical Emergency Trigger
 * Features: Double-tap verification, pulse animation, WhatsApp + SMS share.
 */
export const SOSButton = memo(function SOSButton() {
 const { userProfile, gpsLocation, soundsEnabled } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile, gpsLocation: s.gpsLocation, soundsEnabled: s.soundsEnabled })));
 const [isExpanding, setIsExpanding] = useState(false);

 const triggerWhatsApp = async () => {
 const link = await generateSosWhatsAppLink(userProfile, gpsLocation);
 haptics.sos();
 if (soundsEnabled) sounds.sosSent();
 const popup = window.open(link, '_blank', 'noopener,noreferrer');
 if (popup) popup.opener = null;
 setIsExpanding(false);
 };

 const triggerSms = async () => {
 const link = await generateSosSmsLink(userProfile, gpsLocation);
 haptics.sos();
 if (soundsEnabled) sounds.sosSent();
 window.location.href = link;
 setIsExpanding(false);
 };

 return (
 <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
  {isExpanding && (
 <div
 className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 backdrop-blur-3xl rounded-[2.5rem] p-6 pointer-events-auto"
 style={{
  backgroundColor: 'color-mix(in srgb, var(--bg) 95%, transparent)',
  border: '1px solid color-mix(in srgb, var(--emergency) 40%, transparent)',
  boxShadow: '0 0 80px color-mix(in srgb, var(--emergency) 30%, transparent)',
 }}
 >
 <div className="text-center mb-6">
 <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em]"
  style={{ color: 'var(--emergency-dark)' }}>
 Confirm SOS Trigger
 </h4>
  <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--text-3)' }}>
 {gpsLocation
 ? `${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lon.toFixed(4)}`
 : 'Acquiring GPS...'}
 </p>
 </div>
 <div className="space-y-3">
  <button
  onClick={triggerWhatsApp}
  aria-label="Send emergency alert via WhatsApp"
  className="w-full py-4 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
   style={{
     backgroundColor: 'var(--emergency)',
     color: 'white',
     boxShadow: 'var(--glow-red)',
   }}
  >
  Send WhatsApp SOS
  </button>
  <button
  onClick={triggerSms}
  aria-label="Send emergency alert via SMS"
  className="w-full py-4 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
   style={{
     backgroundColor: 'transparent',
     border: '1px solid color-mix(in srgb, var(--emergency) 20%, transparent)',
     color: 'var(--emergency-dark)',
   }}
  >
  Standard SMS Alert
  </button>
  <button
  onClick={() => setIsExpanding(false)}
  aria-label="Cancel emergency SOS"
  className="w-full py-2 text-[9px] font-bold uppercase tracking-widest transition-all"
   style={{ color: 'var(--text-3)' }}
  >
  Cancel
  </button>
 </div>
 </div>
 )}

 <button
 onClick={() => { setIsExpanding(!isExpanding); haptics.heavy(); }}
 className="relative group pointer-events-auto active:scale-90 transition-all"
 aria-label="Emergency SOS"
 >
 {/* Pulse rings */}
  <span className="absolute inset-0 rounded-full animate-ping"
  style={{ backgroundColor: 'color-mix(in srgb, var(--emergency) 20%, transparent)' }} />
  <span className="absolute inset-0 rounded-full animate-pulse"
  style={{ backgroundColor: 'color-mix(in srgb, var(--emergency) 10%, transparent)' }} />

 <div
 className="relative w-20 h-20 rounded-full flex items-center justify-center border-4 group-hover:scale-110 transition-all"
  style={{
    backgroundColor: 'var(--emergency)',
    borderColor: 'color-mix(in srgb, white 10%, transparent)',
    boxShadow: '0 0 40px color-mix(in srgb, var(--emergency) 50%, transparent)',
    color: 'white',
  }}
 >
 <AlertCircle size={36} strokeWidth={2.5} />
 <div
 className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-semibold border-2"
  style={{
    backgroundColor: 'var(--bg)',
    borderColor: 'var(--emergency)',
    color: 'var(--emergency)',
  }}
 >
 SOS
 </div>
 </div>
 </button>
  </div>
  );
})
