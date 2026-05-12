'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Terminal, Zap, Moon, Sun, Laptop,
  CheckCircle, PaintBucket, Bell, Lock,
  Download, Trash2, Info, LogOut,
  Map, Vibrate, Navigation, Database,
  ShieldCheck, Wifi, WifiOff, User,
  ChevronRight, ToggleLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  getPreferredNavApp,
  setPreferredNavApp,
  NAV_APPS,
  type NavApp,
} from '@/lib/navigation-launch';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/components/ThemeProvider';
import TopSearch from '@/components/dashboard/TopSearch';
import { TerminalHeader } from '@/components/ui/TerminalHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { SettingRow } from '@/components/ui/SettingRow';
import ProfileCard from '@/components/dashboard/ProfileCard';
import Toggle from '@/components/dashboard/Toggle';
import Toast from '@/components/dashboard/Toast';

export default function SettingsPage() {
  const router = useRouter();
  const {
    crashDetectionEnabled,
    setCrashDetectionEnabled,
    isAuthenticated,
    operatorName,
    clearAuth,
    userProfile,
  } = useAppStore();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); document.title = 'System Settings | SafeVixAI'; }, []);

  // Feature toggles
  const [speedAlert, setSpeedAlert] = useState(false);
  const [hazardNotifs, setHazardNotifs] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [sosVibration, setSosVibration] = useState(true);
  const [autoOffline, setAutoOffline] = useState(true);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [navApp, setNavApp] = useState<NavApp>('google');

  // Load persisted nav preference on mount
  useEffect(() => {
    setNavApp(getPreferredNavApp());
  }, []);

  const [toastConfig, setToastConfig] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false, message: '', type: 'info',
  });
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') =>
    setToastConfig({ show: true, message, type });

  const handlePurge = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('svai-offline-bundle');
    }
    showToast('Cache Purged Successfully', 'success');
  };

  const handleExport = () => {
    const data = {
      profile: userProfile,
      exportedAt: new Date().toISOString(),
      version: '2.4.0-SVA',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'safevixai_profile_export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Profile data exported', 'success');
  };

  const handleSignOut = () => {
    clearAuth();
    showToast('Signed out successfully', 'info');
    setTimeout(() => router.push('/login'), 800);
  };

  // ── Section helper ──
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="flex flex-col gap-4">
      <h2 className="sv-section-label px-2">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );

  // ── Toggle Row ──
  const ToggleRow = ({
    icon, label, sub, checked, onChange, danger = false
  }: {
    icon: React.ReactNode;
    label: string; sub: string; checked: boolean;
    onChange: (v: boolean) => void; danger?: boolean;
  }) => (
    <SettingRow
      icon={<div className={danger ? "text-text-red" : "text-brand-light"}>{icon}</div>}
      title={label}
      description={sub}
      rightElement={<Toggle checked={checked} onChange={onChange} ariaLabel={`Toggle ${label}`} />}
    />
  );

  return (
    <div className="sv-page relative flex flex-col transition-colors duration-500">

      <TerminalHeader title="System Configuration" subtitle="DEVICE PREFERENCES" />

      <div className="lg:hidden relative z-[100]">
        <TopSearch isMapPage={false} forceShow={true} showBack={false} />
      </div>
      <main className="sv-page-main max-w-2xl space-y-10 relative z-10">

        {/* ── OPERATOR IDENTITY ── */}
        <section className="flex flex-col gap-5">
          <div className="sv-chip sv-chip-active w-fit">
            <span className="sv-status-dot" />
            <span className="sv-micro leading-none">
              {isAuthenticated ? 'Authenticated Operator' : 'Identity Matrix Active'}
            </span>
          </div>

          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 rounded-card border border-border-green bg-brand-dim p-5 shadow-card"
            >
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand/20">
                <User size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="sv-micro text-text-3">Active Operator</p>
                <p className="sv-h2 truncate uppercase">{operatorName}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand/10 border border-brand/20">
                <ShieldCheck size={12} className="text-brand-light" />
                <span className="text-[9px] font-semibold text-brand-light uppercase tracking-widest">JWT</span>
              </div>
            </motion.div>
          )}

          <ProfileCard />
        </section>

        {/* ── VISUAL INTERFACE ── */}
        <Section title="Visual Interface">
          <SurfaceCard padding="lg">
            <p className="sv-micro mb-4 text-text-3">Appearance Mode</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', icon: <Sun size={20} />, label: 'Light' },
                { id: 'dark', icon: <Moon size={20} />, label: 'Dark' },
                { id: 'system', icon: <Laptop size={20} />, label: 'System' },
              ].map((t) => {
                const isActive = mounted && theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as 'light' | 'dark' | 'system')}
                    className={`flex flex-col items-center gap-3 rounded-card border p-4 transition-all ${isActive
                      ? 'border-border-green bg-brand-dim text-brand-light shadow-brand'
                      : 'border-border bg-surface-2 text-text-3 hover:border-border-green hover:text-text-1'}`}
                  >
                    {t.icon}
                    <span className="sv-micro leading-none">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </SurfaceCard>
        </Section>

        {/* ── VIGILANCE PROTOCOLS ── */}
        <Section title="Vigilance Protocols">
          <SurfaceCard padding="md">
            <ToggleRow icon={<Shield size={20} />}
              label="Crash Detection" sub="Auto-SOS Engagement on Impact"
              checked={crashDetectionEnabled} onChange={setCrashDetectionEnabled} danger />
            <ToggleRow icon={<Zap size={20} />}
              label="Speed Warnings" sub="Real-time G-Force Analytics"
              checked={speedAlert} onChange={setSpeedAlert} />
            <ToggleRow icon={<Bell size={20} />}
              label="Hazard Alerts" sub="Push Notifications for Nearby Hazards"
              checked={hazardNotifs} onChange={setHazardNotifs} />
            <ToggleRow icon={<Vibrate size={20} />}
              label="SOS Vibration" sub="Haptic Feedback on Emergency Trigger"
              checked={sosVibration} onChange={setSosVibration} />
          </SurfaceCard>
        </Section>

        {/* ── NAVIGATION APP ── */}
        <Section title="Navigation">
          <SurfaceCard padding="lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-card border border-border-green bg-brand-dim">
                <Map size={20} className="text-brand-light" />
              </div>
              <div>
                <p className="sv-h2 uppercase">Preferred Navigation App</p>
                <p className="sv-micro mt-0.5 text-text-3">Used for &ldquo;Get Directions&rdquo; in Locator</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {NAV_APPS.map((app) => {
                const isActive = mounted && navApp === app.key;
                return (
                  <button
                    key={app.key}
                    onClick={() => { setNavApp(app.key); setPreferredNavApp(app.key); showToast(`Navigation set to ${app.label}`, 'success'); }}
                    className={`flex flex-col items-center gap-3 rounded-card border p-4 transition-all ${
                      isActive
                        ? 'border-border-green bg-brand-dim text-brand-light shadow-brand'
                        : 'border-border bg-surface-2 text-text-3 hover:border-border-green hover:text-text-1'
                    }`}
                  >
                    <span className="text-2xl">{app.emoji}</span>
                    <span className="sv-micro leading-none">{app.label.replace('Google ', '')}</span>
                  </button>
                );
              })}
            </div>
          </SurfaceCard>
        </Section>

        {/* ── LOCATION & PRIVACY ── */}
        <Section title="Location & Privacy">
          <SurfaceCard padding="md">
            <ToggleRow icon={<Navigation size={20} />}
              label="Live Location" sub="GPS Tracking for Emergency Services"
              checked={locationTracking} onChange={setLocationTracking} />
            <ToggleRow icon={<Database size={20} />}
              label="Auto-Offline Bundle" sub="Cache Critical Data When Connectivity Drops"
              checked={autoOffline} onChange={setAutoOffline} />
            <ToggleRow icon={<Map size={20} />}
              label="Usage Analytics" sub="Anonymous Performance Telemetry"
              checked={analyticsOptIn} onChange={setAnalyticsOptIn} />
          </SurfaceCard>

          <p className="sv-micro px-2 leading-relaxed text-text-3">
            SafeVixAI does not sell your data. All location data stays on-device or is transmitted only during active SOS dispatch.
          </p>
        </Section>

        {/* ── STORAGE MATRIX ── */}
        <Section title="Storage Matrix">
          <SurfaceCard padding="lg">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-surface-3 flex items-center justify-center">
                  <Database size={20} className="text-text-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-1 uppercase tracking-tight">Offline Cache</p>
                  <p className="text-[10px] font-bold text-text-3 uppercase tracking-widest mt-0.5">First Aid · Hazard DB · Route Index</p>
                </div>
              </div>
              <button
                onClick={handlePurge}
                className="px-5 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-semibold uppercase tracking-widest rounded-xl border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all"
              >
                Purge
              </button>
            </div>

            {/* Export data */}
            <div className="border-t border-border pt-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Download size={18} className="text-brand dark:text-brand-light" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-1 uppercase tracking-tight">Export Profile</p>
                  <p className="text-[10px] font-bold text-text-3 uppercase tracking-widest mt-0.5">JSON · GDPR Compliant</p>
                </div>
              </div>
              <button
                onClick={handleExport}
                className="px-5 py-2.5 bg-brand/10 text-brand dark:text-brand-light text-[10px] font-semibold uppercase tracking-widest rounded-xl border border-brand/20 hover:bg-brand/20 active:scale-95 transition-all"
              >
                Export
              </button>
            </div>

            {/* App info */}
            <div className="border-t border-border pt-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-brand-light" />
                <span className="text-[10px] font-semibold text-text-3 uppercase tracking-tighter">SafeVixAI v2.4.0-SVA</span>
              </div>
              <CheckCircle size={14} className="text-brand-light" />
            </div>
          </SurfaceCard>
        </Section>

        {/* ── SYSTEM LINKS ── */}
        <Section title="System">
          <SurfaceCard padding="md">
            <SettingRow
              icon={<User size={18} className="text-brand dark:text-brand-light" />}
              title="Edit Profile"
              description="Identity & Emergency Data"
              onClick={() => router.push('/profile')}
              rightElement={<ChevronRight size={16} className="text-text-3" />}
            />
            <SettingRow
              icon={<Shield size={18} className="text-red-500" />}
              title="Emergency Protocols"
              description="First Response Procedures"
              onClick={() => router.push('/emergency')}
              rightElement={<ChevronRight size={16} className="text-text-3" />}
            />
            <SettingRow
              icon={<Info size={18} className="text-brand-light" />}
              title="Build Info"
              description="IIT Madras Hackathon 2026"
              rightElement={<span className="text-[10px] font-mono font-bold text-text-3">v2.4.0</span>}
            />
          </SurfaceCard>
        </Section>

        {/* ── SIGN OUT ── */}
        {isAuthenticated && (
          <section>
            <button
              onClick={handleSignOut}
              className="w-full h-14 rounded-lg border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-[11px] font-semibold uppercase tracking-[0.1em] text-red-600 dark:text-red-400 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogOut size={15} />
              Sign Out Operator — {operatorName}
            </button>
          </section>
        )}

        <div className="h-4" />
      </main>

      <Toast
        isVisible={toastConfig.show}
        message={toastConfig.message}
        type={toastConfig.type}
        onClose={() => setToastConfig(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}
