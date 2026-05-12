'use client';

import { useAppStore } from '@/lib/store';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const connectivity = useAppStore((state) => state.connectivity);

  if (connectivity !== 'offline') return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-center gap-2 shadow-md animate-pulse"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff size={14} className="shrink-0" />
      <span>NO SIGNAL — OPERATING IN OFFLINE BYSTANDER MODE. SOS QUEUED LOCALLY.</span>
    </div>
  );
}
