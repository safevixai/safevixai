'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import TopSearch from '../components/dashboard/TopSearch';
import FloatingSidebarControls from '../components/dashboard/FloatingSidebarControls';
import RecentAlertsOverlay from '../components/dashboard/RecentAlertsOverlay';
import DashboardMapBootstrap from '../components/dashboard/DashboardMapBootstrap';
import { useAppStore } from '../lib/store';
import {
  ChevronRight, ChevronLeft, AlertTriangle, ShieldCheck,
  MapPin, Navigation, Zap, Activity, Shield, Circle
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

// Dynamically load the map without SSR so MapLibre boots only in the browser.
const MapBackground = dynamic(
  () => import('../components/dashboard/MapBackgroundInner'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-surface-3/50 dark:bg-surface-3/50 animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
      </div>
    )
  });

export default function V2Dashboard() {
  const [isPanelOpen, setIsPanelOpen] = React.useState(true);
  const { gpsLocation, nearbyServices, nearbyRoadIssues, serviceSearchMeta, connectivity } = useAppStore(useShallow((s) => ({ gpsLocation: s.gpsLocation, nearbyServices: s.nearbyServices, nearbyRoadIssues: s.nearbyRoadIssues, serviceSearchMeta: s.serviceSearchMeta, connectivity: s.connectivity })));

  const issueCount = nearbyRoadIssues.length;
  const serviceCount = nearbyServices.length;
  const openIssues = nearbyRoadIssues.filter(i => i.status === 'open').length;

  const areaStatus = openIssues === 0 ? 'secure' : openIssues <= 2 ? 'caution' : 'alert';

  const statusConfig = {
    secure: {
      label: 'Secure Region',
      sub: `No critical anomalies in ${serviceSearchMeta.radiusUsed ? (serviceSearchMeta.radiusUsed / 1000).toFixed(1) : '5.0'}km radius`,
      icon: <ShieldCheck className="w-5 h-5 text-brand-dim dark:text-brand-light" />,
      bg: 'bg-brand-light/10 border-brand-light/20',
      iconBg: 'bg-brand-light/20',
      text: 'text-brand dark:text-brand-light',
      sub_text: 'text-brand/80 dark:text-brand-light/80',
    },
    caution: {
      label: 'Caution Zone',
      sub: `${openIssues} active hazard${openIssues > 1 ? 's' : ''} nearby — proceed with care`,
      icon: <AlertTriangle className="w-5 h-5 text-warning" />,
      bg: 'bg-warning/10 border-warning/20',
      iconBg: 'bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      sub_text: 'text-amber-600/80 dark:text-amber-400/80',
    },
    alert: {
      label: 'High Risk Area',
      sub: `${openIssues} unresolved hazards detected — SOS ready`,
      icon: <Shield className="w-5 h-5 text-red-500" />,
      bg: 'bg-red-500/10 border-red-500/20',
      iconBg: 'bg-red-500/20',
      text: 'text-red-700 dark:text-red-300',
      sub_text: 'text-red-600/80 dark:text-red-400/80',
    },
  };

  const sc = statusConfig[areaStatus];

  return (
    <div className="relative isolate h-[var(--full-content-h)] min-h-[var(--full-content-h)] md:h-[var(--full-content-h-desktop)] md:min-h-[var(--full-content-h-desktop)] w-full overflow-hidden bg-surface-1 text-text-1 flex">
      <div className="relative flex-1 h-full w-full overflow-hidden">
        <DashboardMapBootstrap />
        <MapBackground />
        <TopSearch isMapPage={true} />
        <FloatingSidebarControls />
        <RecentAlertsOverlay />
      </div>
    </div>
  );
}
