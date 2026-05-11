'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { ChevronRight, ChevronLeft, AlertTriangle, ShieldCheck, MapPin, Navigation, Zap, Activity, Shield, Circle } from 'lucide-react';

export function RightSidebar() {
  const [isPanelOpen, setIsPanelOpen] = React.useState(true);
  const {
    gpsLocation,
    nearbyServices,
    nearbyRoadIssues,
    serviceSearchMeta,
    connectivity,
  } = useAppStore();

  const issueCount = nearbyRoadIssues.length;
  const serviceCount = nearbyServices.length;
  const openIssues = nearbyRoadIssues.filter(i => i.status === 'open').length;

  const areaStatus = openIssues === 0 ? 'secure' : openIssues <= 2 ? 'caution' : 'alert';

  const statusConfig = {
    secure: {
      label: 'Secure Region',
      sub: `No critical anomalies in ${serviceSearchMeta.radiusUsed ? (serviceSearchMeta.radiusUsed / 1000).toFixed(1) : '5.0'}km radius`,
      icon: <ShieldCheck className="w-5 h-5 text-brand-light" />,
      bg: 'bg-brand-light/10 border-brand-light/20',
      iconBg: 'bg-brand-light/20',
      text: 'text-brand-light',
      sub_text: 'text-brand-light/80',
    },
    caution: {
      label: 'Caution Zone',
      sub: `${openIssues} active hazard${openIssues > 1 ? 's' : ''} nearby — proceed with care`,
      icon: <AlertTriangle className="w-5 h-5 text-text-amber" />,
      bg: 'bg-text-amber/10 border-text-amber/20',
      iconBg: 'bg-text-amber/20',
      text: 'text-text-amber',
      sub_text: 'text-text-amber/80',
    },
    alert: {
      label: 'High Risk Area',
      sub: `${openIssues} unresolved hazards detected — SOS ready`,
      icon: <Shield className="w-5 h-5 text-emergency" />,
      bg: 'bg-emergency/10 border-emergency/20',
      iconBg: 'bg-emergency/20',
      text: 'text-emergency',
      sub_text: 'text-emergency/80',
    },
  };

  const sc = statusConfig[areaStatus];

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 bg-surface-1/95 backdrop-blur-3xl transition-all duration-300 relative z-40 ${isPanelOpen ? 'w-[320px] xl:w-[380px] border-l border-border' : 'w-0 border-none'}`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={`absolute top-1/2 -translate-y-1/2 w-8 h-16 bg-surface-2 border border-border rounded-l-xl flex items-center justify-center shadow-lg hover:bg-surface-3 transition-colors z-50 text-text-3 ${isPanelOpen ? '-left-4' : '-left-8'}`}
        aria-label={isPanelOpen ? 'Collapse panel' : 'Expand panel'}
      >
        {isPanelOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex-1 overflow-y-auto scrollbar-hide w-[320px] xl:w-[380px]">
          {/* Panel Header */}
          <div className="sticky top-0 bg-surface-2/50 backdrop-blur-md border-b border-border px-6 py-5 z-10">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-text-1 uppercase tracking-tight font-mono">
                Area Intelligence
              </h2>
              {/* Connectivity indicator */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-widest ${
                connectivity === 'online'
                  ? 'bg-brand-light/10 text-brand-light border border-brand-light/20'
                  : 'bg-text-amber/10 text-text-amber border border-text-amber/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connectivity === 'online' ? 'bg-brand-light animate-pulse' : 'bg-text-amber'}`} />
                {connectivity === 'online' ? 'Live' : 'Cached'}
              </div>
            </div>
            {gpsLocation && (
              <p className="text-[11px] font-semibold text-text-3 font-mono uppercase tracking-widest mt-2">
                <MapPin size={11} className="inline mr-1" />
                {gpsLocation.city ?? 'Location detected'}{gpsLocation.state ? `, ${gpsLocation.state}` : ''}
              </p>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Status Card */}
            <div className={`${sc.bg} border rounded-lg p-4 flex items-start gap-3`}>
              <div className={`${sc.iconBg} p-2 rounded-full mt-0.5 flex-shrink-0`}>
                {sc.icon}
              </div>
              <div>
                <h3 className={`font-semibold text-sm ${sc.text}`}>{sc.label}</h3>
                <p className={`text-[13px] ${sc.sub_text} mt-1 leading-relaxed`}>{sc.sub}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-surface-2 border border-border">
                <div className="flex items-center gap-1.5">
                  <Navigation size={12} className="text-brand-light" />
                  <span className="text-[11px] font-semibold text-text-3 font-mono uppercase tracking-widest">Services</span>
                </div>
                <p className="text-2xl font-black text-text-1">{serviceCount}</p>
                <p className="text-[11px] font-semibold text-text-3 font-mono uppercase tracking-wider">Nearby Found</p>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-surface-2 border border-border">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-text-amber" />
                  <span className="text-[11px] font-semibold text-text-3 font-mono uppercase tracking-widest">Hazards</span>
                </div>
                <p className="text-2xl font-black text-text-1">{issueCount}</p>
                <p className="text-[11px] font-semibold text-text-3 font-mono uppercase tracking-wider">
                  {openIssues} Open
                </p>
              </div>
            </div>

            {/* Live Road Issues */}
            {nearbyRoadIssues.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.05em] px-1 mt-2">Active Hazards</p>
                {nearbyRoadIssues.slice(0, 4).map((issue) => (
                  <div
                    key={issue.uuid}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border hover:border-text-amber/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-text-amber/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle size={14} className="text-text-amber" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-text-1 font-mono uppercase tracking-tight truncate">
                        {issue.issueType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] font-medium text-text-3 font-mono uppercase tracking-wider mt-0.5">
                        {issue.roadName || 'Unknown Road'} · {(issue.distance / 1000).toFixed(1)}km
                      </p>
                    </div>
                    <span className={`text-[11px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${
                      issue.severity >= 3
                        ? 'bg-emergency/10 text-emergency'
                        : 'bg-text-amber/10 text-text-amber'
                    }`}>
                      S{issue.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* No data yet */}
            {serviceCount === 0 && issueCount === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center mt-4">
                <div className="w-12 h-12 rounded-lg bg-surface-2 flex items-center justify-center">
                  <Activity size={20} className="text-text-3" />
                </div>
                <p className="text-[13px] font-semibold text-text-2 uppercase tracking-widest font-mono">Scanning Area...</p>
                <p className="text-[11px] font-medium text-text-3 max-w-[180px] leading-relaxed">
                  Allow location to activate live hazard intelligence
                </p>
              </div>
            )}

            {/* Driving Score */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-brand/10 to-brand-light/5 border border-brand/20 flex items-center gap-4 mt-2">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                <Zap size={20} className="text-brand-light" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-text-3 uppercase tracking-widest font-mono">AI Sentinel</p>
                <p className="text-[13px] font-bold text-text-1 uppercase tracking-tight font-mono">Monitoring Active</p>
              </div>
              <div className="flex items-center gap-1">
                <Circle size={8} className="fill-brand-light text-brand-light animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
