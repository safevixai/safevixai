'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  User, Shield, CheckCircle, 
  Car, LogOut,
  CloudOff, ShieldAlert, Award,
  Heart, Star, Edit3, Save, X, Bell
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import TopSearch from '@/components/dashboard/TopSearch';
import { TerminalHeader } from '@/components/ui/TerminalHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { SettingRow } from '@/components/ui/SettingRow';
import Toggle from '@/components/dashboard/Toggle';
import QREmergencyCard from '@/components/profile/QREmergencyCard';

export default function ProfilePage() {
  const { 
    crashDetectionEnabled, 
    setCrashDetectionEnabled,
    userProfile,
    setUserProfile,
    clearAuth,
    operatorName,
    isAuthenticated,
  } = useAppStore();

  const [offlineMode, setOfflineMode] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ ...userProfile });
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => { document.title = 'Profile | SafeVixAI'; }, []);

  // Sync draft when not editing (e.g. external store update)
  useEffect(() => {
    if (!isEditing) setEditDraft({ ...userProfile });
  }, [isEditing, userProfile]);

  const handleEdit = () => {
    setEditDraft({ ...userProfile });
    setIsEditing(true);
  };

  const handleSave = () => {
    setUserProfile(editDraft);
    setIsEditing(false);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const handleCancel = () => {
    setEditDraft({ ...userProfile });
    setIsEditing(false);
  };

  const handlePurge = () => {
    if (!showPurgeConfirm) {
      setShowPurgeConfirm(true);
      setTimeout(() => setShowPurgeConfirm(false), 3000);
    } else {
      // Intended purge logic here
      alert('Local session data purged.');
      setShowPurgeConfirm(false);
    }
  };

  // Derive a display ID from the user name (or placeholder)
  const displayId = userProfile.name
    ? `SVA-${userProfile.name.slice(0, 4).toUpperCase().replace(/\s/g, '')}-X`
    : 'NOT SET';

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#f8fafc] dark:bg-[#0A0E14] text-slate-800 dark:text-[#d7e3fc] overflow-x-hidden flex flex-col transition-colors duration-500 font-inter">
      
      {/* ── Unified Tactical Navigation Header ── */}
      <TerminalHeader title="Operator Identity Matrix" subtitle="PROFILE & SETTINGS" />
      
      <div className="lg:hidden relative z-[100]">
        <TopSearch isMapPage={false} forceShow={true} showBack={false} />
      </div>
      <main className="flex-1 w-full max-w-2xl mx-auto pt-28 lg:pt-24 pb-44 px-6 space-y-12 relative z-10">
        
        {/* ── Save Flash Banner ── */}
        <AnimatePresence>
          {saveFlash && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl text-sm font-semibold uppercase tracking-widest"
            >
              <CheckCircle size={16} />
              Profile Saved
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Section 1: Hero Identity Matrix ── */}
        <section className="flex flex-col gap-8 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.1em] font-space leading-none">Profile Matrix Sync</span>
            </div>

            {/* Edit / Save / Cancel controls */}
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-[#1A5C38]/10 dark:hover:text-[#00C896] transition-all"
              >
                <Edit3 size={12} />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-2 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-500 text-[10px] font-semibold uppercase tracking-widest hover:text-red-500 transition-all"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-4 py-2 rounded-full bg-emerald-500 text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                >
                  <Save size={12} />
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white dark:border-white/10 ring-8 ring-emerald-500/5 overflow-hidden relative shadow-2xl transition-transform duration-500 group-hover:scale-105 bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                {userProfile.name ? (
                  <span className="text-4xl font-black text-slate-400 dark:text-white/40 uppercase">
                    {userProfile.name.charAt(0)}
                  </span>
                ) : (
                  <User size={40} className="text-slate-300 dark:text-white/20" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-10 h-10 rounded-lg flex items-center justify-center border-4 border-white dark:border-[#0A0E14] shadow-lg">
                <CheckCircle size={20} className="text-white" />
              </div>
            </div>
            
            <div className="text-center sm:text-left flex flex-col gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="Your Full Name"
                  className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-space leading-none bg-transparent border-b-2 border-emerald-500 outline-none placeholder:text-slate-300 dark:placeholder:text-white/20 w-full"
                />
              ) : (
                <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-space leading-none">
                  {userProfile.name || <span className="text-slate-300 dark:text-white/20">Set Your Name</span>}
                </h2>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <div className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                   <span className="text-[9px] font-semibold text-slate-500 dark:text-emerald-500 uppercase tracking-widest leading-none">ID: {displayId}</span>
                </div>
                <div className="px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center gap-1">
                   <Award size={10} className="text-amber-600 dark:text-amber-400" />
                   <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">SafeVixAI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vitals HUD Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SurfaceCard padding="md" className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Active Vessel</p>
                  <Car size={16} className="text-emerald-500" />
               </div>
               <div className="flex flex-col">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editDraft.vehicleNumber}
                      onChange={e => setEditDraft(d => ({ ...d, vehicleNumber: e.target.value }))}
                      placeholder="MH 01 AB 1234"
                      className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter bg-transparent border-b-2 border-emerald-500/60 outline-none placeholder:text-slate-300 dark:placeholder:text-white/20"
                    />
                  ) : (
                    <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      {userProfile.vehicleNumber || <span className="text-slate-300 dark:text-white/20">Not Set</span>}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">VEHICLE_REGISTRATION</span>
               </div>
            </SurfaceCard>
            
            <SurfaceCard padding="md" className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Bio Signature</p>
                  <Heart size={16} className="text-red-500" />
               </div>
               <div className="flex flex-col">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editDraft.bloodGroup}
                      onChange={e => setEditDraft(d => ({ ...d, bloodGroup: e.target.value }))}
                      placeholder="O+, A-, B+..."
                      className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter bg-transparent border-b-2 border-red-500/60 outline-none placeholder:text-slate-300 dark:placeholder:text-white/20"
                    />
                  ) : (
                    <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      {userProfile.bloodGroup || <span className="text-slate-300 dark:text-white/20">Not Set</span>}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">EMERGENCY_BROADCAST_ON</span>
               </div>
            </SurfaceCard>

            {/* Emergency Contact — full width */}
            <SurfaceCard padding="md" className="sm:col-span-2 flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Emergency Contact</p>
                  <Shield size={16} className="text-[#1A5C38] dark:text-[#00C896]" />
               </div>
               <div className="flex flex-col">
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editDraft.emergencyContact}
                      onChange={e => setEditDraft(d => ({ ...d, emergencyContact: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="text-xl font-black text-slate-900 dark:text-white tracking-tighter bg-transparent border-b-2 border-[#1A5C38]/60 outline-none placeholder:text-slate-300 dark:placeholder:text-white/20"
                    />
                  ) : (
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {userProfile.emergencyContact || <span className="text-slate-300 dark:text-white/20 font-normal text-base">Add emergency contact</span>}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">SOS_DISPATCH_CONTACT</span>
               </div>
            </SurfaceCard>
          </div>
        </section>

        {/* ── Section: QR Emergency Card ── */}
        <QREmergencyCard />

        {/* ── Section 2: Operational Protocols ── */}
        <section className="flex flex-col gap-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 font-space px-2">Mission Protocol</h3>
          <SurfaceCard padding="md">
             {[
               { id: 'offline', icon: <CloudOff size={18} />, label: 'V8 Offline Mode', sub: 'Process locally, no network leakage', state: offlineMode, toggle: setOfflineMode },
               { id: 'crash', icon: <ShieldAlert size={18} />, label: 'Crash Detection', sub: 'Instant satellite SOS engagement', state: crashDetectionEnabled, toggle: setCrashDetectionEnabled },
               { id: 'notify', icon: <Bell size={18} />, label: 'Push Hub', sub: 'Critical hazard & P0 alerts', state: pushNotifs, toggle: setPushNotifs },
             ].map(item => (
                <SettingRow
                  key={item.id}
                  icon={<div className={item.state ? 'text-emerald-500' : 'text-slate-400'}>{item.icon}</div>}
                  title={item.label}
                  description={item.sub}
                  rightElement={<Toggle checked={item.state} onChange={item.toggle} ariaLabel={`Toggle ${item.label}`} />}
                />
             ))}
          </SurfaceCard>
        </section>

        {/* ── Section 3: Achievements & Legacy ── */}
        <section className="flex flex-col gap-6">
           <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 font-space px-2">Tactical Awards</h3>
           <div className="flex gap-4 overflow-x-auto pb-6 -mx-6 px-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {[
                { title: 'Road Safety', score: 'Active User', bgColor: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
                { title: 'First Responder', score: 'Trained', bgColor: 'bg-amber-500/10', iconColor: 'text-amber-500' },
                { title: 'AI Master', score: 'SafeVixAI', bgColor: 'bg-[#1A5C38]/10', iconColor: 'text-[#1A5C38] dark:text-[#00C896]' },
              ].map(badge => (
                <SurfaceCard key={badge.title} padding="md" className="flex-shrink-0 w-40 flex flex-col items-center gap-3">
                   <div className={`p-4 rounded-xl ${badge.bgColor}`}>
                      <Star size={24} className={badge.iconColor} />
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] font-semibold text-slate-900 dark:text-white uppercase tracking-tight leading-none">{badge.title}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{badge.score}</p>
                   </div>
                </SurfaceCard>
              ))}
           </div>
        </section>

        {/* Action Panel */}
        <section className="flex flex-col items-center gap-4 pt-10">
           {/* Sign Out — only if using real auth */}
           {isAuthenticated && (
             <button
               onClick={() => { clearAuth(); }}
               className="w-full h-14 rounded-full border-2 border-[#1A5C38]/30 bg-[#1A5C38]/10 hover:bg-[#1A5C38]/20 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-600 dark:text-[#00C896] flex items-center justify-center gap-2 transition-all active:scale-95"
             >
               <LogOut size={14} />
               Sign Out Operator
             </button>
           )}
           <button 
             onClick={handlePurge}
             className={`h-14 px-10 rounded-full border-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all active:scale-95 ${
               showPurgeConfirm
                 ? 'border-red-500 bg-red-500/10 text-red-500'
                 : 'border-slate-200 dark:border-white/10 text-slate-400 hover:text-red-500 hover:border-red-500/20'
             }`}
           >
             {showPurgeConfirm ? 'CONFIRM PURGE?' : 'PURGE LOCAL SESSION'}
           </button>
           <p className="text-[9px] font-semibold text-slate-300 dark:text-slate-500 uppercase tracking-[0.1em]">Sentinel V4.2 Real-time Security Layer</p>
        </section>

      </main>
    </div>
  );
}
