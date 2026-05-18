'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Layers,
  LocateFixed,
  Satellite,
  TrafficCone,
  Shield,
  Flame,
  Cross,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

// ── Driving Score 2.0 (High-Fidelity Gauge) ──
const DrivingScore = ({ score }: { score: number }) => {
  const getStatus = (s: number) => {
    if (s >= 80) return { label: 'OPTIMAL', color: 'var(--brand-light)', glow: 'var(--brand-dim)' };
    if (s >= 60) return { label: 'CAUTION', color: 'var(--text-amber)', glow: 'rgba(245, 212, 79, 0.5)' };
    return { label: 'CRITICAL', color: 'var(--emergency)', glow: 'var(--emergency-dim)' };
  };

  const { label, color, glow } = getStatus(score);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div
      className="relative flex flex-col items-center group pointer-events-auto"
    >
      {/* Label (Sliding out) */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="self-center bg-white/90 dark:bg-surface-1/90 backdrop-blur-xl rounded-full px-4 py-1.5 border border-border-md dark:border-white/10 shadow-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-pulse shadow-[0_0_8px_var(--emergency)]"></span>
          <span className="text-[10px] font-semibold tracking-[0.1em] text-text-1 dark:text-brand uppercase font-space">
            Priority Vectors Detected
          </span>
        </div>
        <p className="text-xs font-semibold tracking-widest font-space" style={{ color }}>{label}</p>
      </div>

      <div className="relative w-14 h-14 rounded-full bg-white/95 dark:bg-surface-1/90 backdrop-blur-xl shadow-2xl ring-1 ring-white/40 dark:ring-white/10 flex items-center justify-center cursor-help transition-all duration-500 overflow-hidden">
        {/* Subtle Neon Glow Backdrop */}
        <div
          className="absolute inset-0 blur-xl opacity-20"
          style={{ backgroundColor: color }}
        />

        <svg className="absolute inset-0 w-full h-full -rotate-90">
          {/* Background Track */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          {/* Progress Gauge */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
          />
        </svg>

        <div className="z-10 flex flex-col items-center">
          <span
            className="text-lg font-black leading-none tracking-tighter"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Layer Toggle Item ──
interface LayerToggleProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
  activeColor?: string;
}

const LayerToggle = ({
  icon,
  label,
  active,
  onToggle,
  disabled = false,
  disabledReason,
  activeColor = 'var(--brand)',
}: LayerToggleProps) => (
  <button
    role="button"
    aria-label={`Toggle ${label} layer`}
    aria-pressed={active}
    aria-disabled={disabled}
    disabled={disabled}
    onClick={onToggle}
    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : active
          ? 'bg-brand/10 dark:bg-brand/15'
          : 'hover:bg-white/60 dark:hover:bg-white/5'
    }`}
    title={disabled ? disabledReason : undefined}
  >
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
        active && !disabled ? 'text-white' : 'text-text-2'
      }`}
      style={active && !disabled ? { backgroundColor: activeColor } : { backgroundColor: 'var(--surface-3)' }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <span className={`text-sm font-semibold block ${active && !disabled ? 'text-text-1' : 'text-text-2'}`}>
        {label}
      </span>
      {disabled && disabledReason && (
        <span className="text-[10px] text-text-3 block mt-0.5">{disabledReason}</span>
      )}
    </div>
    {/* Active dot indicator */}
    <div
      className={`w-2 h-2 rounded-full shrink-0 transition-all duration-200 ${
        active && !disabled ? 'scale-100' : 'scale-0'
      }`}
      style={{ backgroundColor: activeColor }}
    />
  </button>
);

// ── Tactical HUD Button ──
interface HUDButtonProps {
  icon: React.ReactNode;
  label: string;
  color?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

const HUDButton = ({ icon, label, color = "#c5c6cd", href, onClick, ariaLabel }: HUDButtonProps) => {
  const ButtonContent = (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="relative w-12 h-12 flex items-center justify-center rounded-full bg-white/95 dark:bg-surface-2/90 backdrop-blur-xl ring-1 ring-white/40 dark:ring-white/10 shadow-2xl transition-all group/btn pointer-events-auto"
    >
      {/* Side Label */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/btn:opacity-100 transition-all duration-300 pointer-events-none translate-x-2 group-hover/btn:translate-x-0">
        <span className="bg-white/95 dark:bg-surface-1/90 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-border-md dark:border-white/10 text-[10px] font-semibold tracking-[0.15em] text-text-1 dark:text-brand-light uppercase whitespace-nowrap shadow-2xl font-space">
          {label}
        </span>
      </div>

      <div className="transition-transform duration-300 group-hover/btn:rotate-12" style={{ color }}>
        {icon}
      </div>
    </button>
  );

  if (href) {
    return <Link href={href} className="pointer-events-auto">{ButtonContent}</Link>;
  }

  return <div className="pointer-events-auto">{ButtonContent}</div>;
};

// ── Check if traffic API key is available ──
const TRAFFIC_KEY_AVAILABLE = !!process.env.NEXT_PUBLIC_TOMTOM_KEY;

// ── Main Dashboard HUD ──
export default function FloatingSidebarControls() {
  const [isScanning, setIsScanning] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const drivingScore = useAppStore((state) => state.drivingScore);

  // Layer states from Zustand
  const showHazardHeatmap = useAppStore((s) => s.showHazardHeatmap);
  const setShowHazardHeatmap = useAppStore((s) => s.setShowHazardHeatmap);
  const showSatellite = useAppStore((s) => s.showSatellite);
  const setShowSatellite = useAppStore((s) => s.setShowSatellite);
  const showTraffic = useAppStore((s) => s.showTraffic);
  const setShowTraffic = useAppStore((s) => s.setShowTraffic);
  const showSafeSpaces = useAppStore((s) => s.showSafeSpaces);
  const setShowSafeSpaces = useAppStore((s) => s.setShowSafeSpaces);
  const showEmergencyServices = useAppStore((s) => s.showEmergencyServices);
  const setShowEmergencyServices = useAppStore((s) => s.setShowEmergencyServices);

  const activeLayerCount = [showSatellite, showTraffic, showSafeSpaces, showHazardHeatmap, showEmergencyServices].filter(Boolean).length;

  const handleRelocate = () => {
    setIsScanning(true);
    window.dispatchEvent(new CustomEvent('svai:refresh-location'));
    setTimeout(() => setIsScanning(false), 2000);
  };

  return (
    <div
      className="absolute right-4 bottom-24 lg:bottom-8 z-40 flex flex-col items-center gap-5 pointer-events-none"
    >
      {/* ── Driver Analytics ── */}
      <DrivingScore score={drivingScore ?? 78} />

      {/* ── Control Stack ── */}
      <div className="flex flex-col gap-3">
        <div className="relative pointer-events-auto">
          <HUDButton
            icon={<Layers size={20} strokeWidth={2.5} />}
            label="Map Layers"
            ariaLabel={`Map Layers – ${activeLayerCount} active`}
            onClick={() => setShowLayersMenu(!showLayersMenu)}
            color={showLayersMenu ? 'var(--brand)' : undefined}
          />
          {activeLayerCount > 0 && (
            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shadow-lg pointer-events-none z-10">
              {activeLayerCount}
            </span>
          )}
        </div>

        <HUDButton
          icon={<LocateFixed size={20} strokeWidth={2.5} />}
          label="Relocate Sentinel"
          ariaLabel="Re-center map on current location"
          onClick={handleRelocate}
        />

        <HUDButton
          icon={<ShieldAlert size={20} strokeWidth={2.5} />}
          label="Emergency Protocols"
          ariaLabel="Open emergency protocols"
          href="/emergency"
          color="var(--emergency)"
        />
      </div>

      {/* ── Consolidated Layer Menu ── */}
              {showLayersMenu && (
          <div
            className="absolute right-[72px] bottom-[60px] bg-white/95 dark:bg-surface-2/95 backdrop-blur-2xl border border-border-md dark:border-white/10 rounded-2xl shadow-2xl w-64 pointer-events-auto z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h4 className="text-xs font-bold text-text-3 uppercase tracking-[0.15em] font-space">
                Map Layers
              </h4>
              <button
                onClick={() => setShowLayersMenu(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-surface-3 transition-colors text-text-3"
                aria-label="Close layer menu"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="px-2 pb-2 flex flex-col gap-0.5">
              <LayerToggle
                icon={<Satellite size={16} strokeWidth={2.5} />}
                label="Satellite"
                active={showSatellite}
                onToggle={() => setShowSatellite(!showSatellite)}
                activeColor="#3B82F6"
              />

              <LayerToggle
                icon={<TrafficCone size={16} strokeWidth={2.5} />}
                label="Traffic"
                active={showTraffic}
                onToggle={() => {
                  if (TRAFFIC_KEY_AVAILABLE) setShowTraffic(!showTraffic);
                }}
                disabled={!TRAFFIC_KEY_AVAILABLE}
                disabledReason="TomTom API key not configured"
                activeColor="#F59E0B"
              />

              <LayerToggle
                icon={<Shield size={16} strokeWidth={2.5} />}
                label="Safe Spaces"
                active={showSafeSpaces}
                onToggle={() => setShowSafeSpaces(!showSafeSpaces)}
                activeColor="var(--brand-light)"
              />

              <LayerToggle
                icon={<Flame size={16} strokeWidth={2.5} />}
                label="Hazard Heatmap"
                active={showHazardHeatmap}
                onToggle={() => setShowHazardHeatmap(!showHazardHeatmap)}
                activeColor="var(--emergency)"
              />

              <LayerToggle
                icon={<Cross size={16} strokeWidth={2.5} />}
                label="Emergency Services"
                active={showEmergencyServices}
                onToggle={() => setShowEmergencyServices(!showEmergencyServices)}
                activeColor="var(--brand)"
              />
            </div>

            {/* Heatmap Legend — only shown when heatmap is active */}
                          {showHazardHeatmap && (
                <div
                  className="overflow-hidden"
                >
                  <div className="mx-3 mb-3 pt-3 border-t border-border dark:border-white/10">
                    <p className="text-[10px] font-semibold text-text-3 uppercase tracking-widest mb-2 font-space">
                      Hazard Legend
                    </p>
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emergency shadow-[0_0_8px_var(--emergency)]" />
                        <span className="text-text-2">High Severity (S4+)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-warning shadow-[0_0_8px_var(--warning)]" />
                        <span className="text-text-2">Traffic &amp; Accident</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
                        <span className="text-text-2">Weather &amp; Flood</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

      {/* ── Priority Action: SOS ── */}
      <Link href="/sos" className="pointer-events-auto mt-2">
        <button
          onClick={() => {
             try { if (navigator?.vibrate) navigator.vibrate(50); } catch (e) {}
          }}
          aria-label="Emergency SOS – tap for immediate help"
          className="relative w-16 h-16 bg-emergency rounded-full flex items-center justify-center shadow-[0_0_40px_var(--emergency)] group z-50 overflow-hidden"
        >
          {/* Multi-layered Tactical Ripples */}
          <div
            className="absolute inset-0 rounded-full border-2 border-white/30"
          />
          <div
            className="absolute inset-0 rounded-full border-2 border-white/20"
          />

          <span className="text-white text-lg font-black tracking-[0.1em] relative z-10 drop-shadow-md">
            SOS
          </span>

          {/* Dynamic "Scanning" Overlay effect */}
                      {isScanning && (
              <div
                className="absolute inset-x-0 h-10 w-full bg-white/20 blur-xl pointer-events-none z-20"
              />
            )}
        </button>
      </Link>
    </div>
  );
}
