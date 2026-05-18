'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { logClientError } from '@/lib/client-logger';
import { publicApiWebSocketUrl } from '@/lib/public-env';
import { GROUP_TRACKING_BROADCAST_INTERVAL_MS } from '@/lib/safety-constants';
import { EmergencyMap } from '@/components/EmergencyMap';
import SystemHeader from '@/components/dashboard/SystemHeader';
import { Loader2, Users, MapPin, Navigation } from 'lucide-react';
import { usePageEntry } from '@/hooks/usePageEntry';

interface FamilyMember {
  user_id: string;
  lat: number;
  lon: number;
  timestamp: number;
}

export default function TrackingPage() {
  const { gpsLocation, userProfile, authToken } = useAppStore();
  const pageRef = usePageEntry();
  const [groupId, setGroupId] = useState('');
  const [userId, setUserId] = useState(userProfile?.name || '');
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState<Record<string, FamilyMember>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const centerCoords: [number, number] = gpsLocation ? [gpsLocation.lat, gpsLocation.lon] : [28.6139, 77.2090];

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };
  }, []);

  const connectToTracking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !userId || !authToken) return;

    const wsUrl = publicApiWebSocketUrl(
      `/api/v1/tracking/${groupId}?${new URLSearchParams({ token: authToken })}`,
    );
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      
      // Start broadcasting our own location
      trackingIntervalRef.current = setInterval(() => {
        if (navigator.geolocation && ws.readyState === WebSocket.OPEN) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const payload = {
              user_id: userId,
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            };
            ws.send(JSON.stringify(payload));
          });
        }
      }, GROUP_TRACKING_BROADCAST_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.user_id && data.lat && data.lon) {
          setMembers((prev) => ({
            ...prev,
            [data.user_id]: {
              user_id: data.user_id,
              lat: data.lat,
              lon: data.lon,
              timestamp: Date.now(),
            },
          }));
        }
      } catch (err) {
        logClientError('Invalid WS message', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) wsRef.current.close();
    setConnected(false);
    setMembers({});
  };

  const facilitiesList = Object.values(members).map((member) => ({
    id: member.user_id,
    name: member.user_id === userId ? `${member.user_id} (You)` : member.user_id,
    type: 'family',
    coords: [member.lat, member.lon] as [number, number],
    accentColor: member.user_id === userId ? '#2563eb' : '#10b981', // Blue for you, Green for others
    distance: 'Live',
  }));

  return (
    <div ref={pageRef} className="min-h-dvh bg-bg dark:bg-surface-1 flex flex-col font-['Inter'] relative overflow-hidden">
      <SystemHeader title="Live Family Tracking" showBack={true} />

      {!connected ? (
        <main className="flex-1 flex items-center justify-center p-4 z-10 relative">
          <div className="w-full max-w-md bg-white/80 dark:bg-surface-2/60 backdrop-blur-xl border border-border-md dark:border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-brand/10 text-brand dark:text-brand-light rounded-2xl flex items-center justify-center">
                <Users size={32} />
              </div>
            </div>
            <h2 className="text-xl font-black text-center text-text-1 mb-2 uppercase tracking-tight">
              Join Tracking Group
            </h2>
            <p className="text-center text-sm text-text-2 mb-8 font-semibold">
              Enter a secure family code to broadcast and view live GPS locations of your group members.
            </p>

            <form onSubmit={connectToTracking} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-text-2 mb-1">
                  Family / Group Code
                </label>
                <input
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full bg-surface-1 border border-border-md dark:border-white/10 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="e.g. SMITH-FAMILY-24"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-text-2 mb-1">
                  Your Display Name
                </label>
                <input
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-surface-1 border border-border-md dark:border-white/10 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="e.g. John"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand hover:bg-brand/80 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all mt-4"
              >
                Start Tracking
              </button>
            </form>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col relative z-10 w-full h-full">
          {/* Top Status Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center bg-white/90 dark:bg-bg/80 backdrop-blur-2xl p-4 rounded-xl border border-border-md dark:border-white/10 shadow-2xl">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-2">
                Active Group
              </div>
              <div className="font-black text-text-1 flex items-center gap-2">
                {groupId} 
                <span className="w-2 h-2 rounded-full bg-brand-light animate-pulse" />
              </div>
            </div>
            
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-emergency/10 text-emergency-dark dark:text-emergency-dim hover:bg-emergency/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-emergency/20"
            >
              Leave
            </button>
          </div>

          <div className="absolute top-24 left-4 z-20 flex flex-col gap-2">
            {Object.values(members).map(member => (
              <div key={member.user_id} className="bg-white/90 dark:bg-bg/80 backdrop-blur-xl px-4 py-2 rounded-lg border border-border-md dark:border-white/10 shadow-xl flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${member.user_id === userId ? 'bg-brand' : 'bg-brand-light'} animate-pulse`} />
                <span className="text-xs font-bold text-text-1">
                  {member.user_id === userId ? 'You' : member.user_id}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 w-full bg-surface-1 dark:bg-bg">
             <EmergencyMap
                center={centerCoords}
                facilities={facilitiesList}
                currentLocation={
                  gpsLocation
                    ? {
                        lat: gpsLocation.lat,
                        lon: gpsLocation.lon,
                        accuracy: gpsLocation.accuracy,
                        title: 'You',
                        subtitle: 'Broadcasting live',
                      }
                    : null
                }
              />
          </div>
        </main>
      )}
    </div>
  );
}
