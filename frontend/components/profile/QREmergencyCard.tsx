'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Heart, Shield, Phone, Car, QrCode,
  Download, Share2, AlertTriangle, CheckCircle2,
  Zap, Eye
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface UserProfile {
  name?: string;
  bloodGroup?: string;
  vehicleNumber?: string;
  emergencyContact?: string;
}

export default function QREmergencyCard() {
  const { userProfile } = useAppStore() as { userProfile: UserProfile };
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate unique ID from name — same algo as profile page
  const displayId = userProfile.name
    ? `SVA-${userProfile.name.slice(0, 4).toUpperCase().replace(/\s/g, '')}-X`
    : 'SVA-XXXX-X';

  // The public URL that the QR code encodes
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://safevixai.app';

  const emergencyPayload = {
    name: userProfile.name || '',
    blood: userProfile.bloodGroup || '',
    vehicle: userProfile.vehicleNumber || '',
    contact: userProfile.emergencyContact || '',
  };

  const encodePayload = (payload: typeof emergencyPayload) => {
    if (typeof window === 'undefined') return '';
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const qrUrl = `${baseUrl}/emergency-card/${encodeURIComponent(displayId)}#data=${encodePayload(emergencyPayload)}`;

  const isProfileComplete = !!(
    userProfile.name &&
    userProfile.bloodGroup &&
    userProfile.emergencyContact
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SafeVixAI Emergency Card',
          text: `Emergency card for ${userProfile.name || 'Unknown'}`,
          url: qrUrl,
        });
      } catch { /* user dismissed */ }
    } else {
      handleCopyLink();
    }
  };

  return (
    <>
      {/* ── QR Emergency Card Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-6"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-2 font-space">
            QR Emergency Card
          </h3>
          {isProfileComplete ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-light/10 border border-brand-light/20">
              <CheckCircle2 size={10} className="text-brand-light" />
              <span className="text-[9px] font-semibold text-brand-dim dark:text-brand-light uppercase tracking-widest">
                Card Ready
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20">
              <AlertTriangle size={10} className="text-warning" />
              <span className="text-[9px] font-semibold text-warning-dim dark:text-warning uppercase tracking-widest">
                Incomplete
              </span>
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="relative rounded-lg bg-white dark:bg-surface-1 border border-border-md dark:border-white/10 overflow-hidden shadow-xl">

          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-dim via-brand to-brand-dim" />

          {/* Card Body */}
          <div className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">

            {/* QR Code Block */}
            <div className="relative flex-shrink-0">
              {/* Outer glow ring */}
              <div className="absolute -inset-2 rounded-lg bg-gradient-to-br from-brand-dim/20 to-brand/10 blur-md" />
              <div className="relative p-4 rounded-lg bg-white dark:bg-surface-2 border border-border-md dark:border-border-md shadow-inner">
                <QRCodeSVG
                  value={qrUrl}
                  size={120}
                  bgColor="transparent"
                  fgColor="#000000"
                  level="H"
                  includeMargin={false}
                />
                {/* Center logo overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-lg border-2 border-white">
                    <Shield size={14} className="text-white" />
                  </div>
                </div>
              </div>

              {/* "SCAN IN EMERGENCY" label */}
              <div className="mt-2 text-center">
                <span className="text-[8px] font-semibold text-text-2 dark:text-text-2 uppercase tracking-[0.25em]">
                  Scan in emergency
                </span>
              </div>
            </div>

            {/* Info Block */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">

              {/* Operator ID badge */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-brand/10 dark:bg-brand/20 border border-brand/20">
                  <span className="text-[10px] font-semibold text-brand-dim dark:text-brand uppercase tracking-widest font-space">
                    {displayId}
                  </span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              </div>

              {/* Vitals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emergency/10 flex items-center justify-center flex-shrink-0">
                    <Heart size={13} className="text-emergency" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold text-text-2 uppercase tracking-wider">Blood</p>
                    <p className="text-sm font-semibold text-text-1 dark:text-white truncate">
                      {userProfile.bloodGroup || <span className="text-text-3 dark:text-white/20 font-normal text-xs">Not set</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <Car size={13} className="text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold text-text-2 uppercase tracking-wider">Vehicle</p>
                    <p className="text-sm font-semibold text-text-1 dark:text-white truncate">
                      {userProfile.vehicleNumber || <span className="text-text-3 dark:text-white/20 font-normal text-xs">Not set</span>}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <Phone size={13} className="text-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold text-text-2 uppercase tracking-wider">Emergency Contact</p>
                    <p className="text-sm font-semibold text-text-1 dark:text-white truncate">
                      {userProfile.emergencyContact || <span className="text-text-3 dark:text-white/20 font-normal text-xs">Not set</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning if not complete */}
              {!isProfileComplete && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/5 border border-warning/20">
                  <AlertTriangle size={12} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-warning-dim dark:text-warning leading-relaxed">
                    Complete your profile above to activate the emergency card. First responders need blood group and emergency contact.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-6 pb-5 flex items-center gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-surface-2 dark:bg-white/5 hover:bg-surface-3 dark:hover:bg-white/10 border border-border-md dark:border-white/10 transition-all text-[11px] font-semibold text-text-2 dark:text-text-3 uppercase tracking-wider"
            >
              <Eye size={13} />
              Preview
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-brand hover:bg-brand-dim border border-brand/30 transition-all text-[11px] font-semibold text-white uppercase tracking-wider shadow-md shadow-brand/20"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={13} />
                    Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="share"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex items-center gap-1.5"
                  >
                    <Share2 size={13} />
                    Share Card
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Tactical bottom watermark */}
          <div className="border-t border-border-md dark:border-white/5 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap size={10} className="text-brand" />
              <span className="text-[8px] font-semibold text-text-2 uppercase tracking-[0.1em]">
                SafeVixAI Emergency Protocol
              </span>
            </div>
            <span className="text-[8px] font-bold text-text-3 dark:text-text-2 uppercase tracking-widest">
              QR-EMER-V2
            </span>
          </div>
        </div>
      </motion.section>

      {/* ── Preview Modal ── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-surface-1 rounded-xl overflow-hidden shadow-2xl border border-border-md dark:border-white/10"
            >
              {/* Modal Header */}
              <div className="h-2 bg-gradient-to-r from-brand-dim via-brand to-brand-dim" />
              <div className="p-6 flex flex-col items-center gap-6">

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Shield size={16} className="text-brand-dim dark:text-brand" />
                    <span className="text-xs font-semibold text-brand-dim dark:text-brand uppercase tracking-widest font-space">SafeVixAI</span>
                  </div>
                  <h2 className="text-2xl font-black text-text-1 dark:text-white uppercase tracking-tight">
                    {userProfile.name || 'UNKNOWN OPERATOR'}
                  </h2>
                  <p className="text-[10px] font-bold text-text-2 uppercase tracking-widest mt-1">{displayId}</p>
                </div>

                {/* Large QR */}
                <div className="relative p-5 rounded-lg bg-white border-2 border-border-md shadow-inner">
                  <QRCodeSVG
                    value={qrUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={false}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg border-2 border-white">
                      <Shield size={18} className="text-white" />
                    </div>
                  </div>
                </div>

                {/* Vitals preview */}
                <div className="w-full grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 rounded-xl bg-emergency/10 dark:bg-emergency/10 border border-emergency/20 dark:border-emergency/20">
                    <Heart size={16} className="text-emergency mb-1" />
                    <span className="text-[8px] font-bold text-text-2 uppercase tracking-wider">Blood</span>
                    <span className="text-sm font-semibold text-text-1 dark:text-white">
                      {userProfile.bloodGroup || '—'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-brand-light/10 dark:bg-brand/10 border border-brand-light/20 dark:border-brand/20">
                    <Car size={16} className="text-brand mb-1" />
                    <span className="text-[8px] font-bold text-text-2 uppercase tracking-wider">Vehicle</span>
                    <span className="text-[11px] font-semibold text-text-1 dark:text-white truncate w-full text-center">
                      {userProfile.vehicleNumber || '—'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-warning/10 dark:bg-warning/10 border border-warning/20 dark:border-warning/20">
                    <Phone size={16} className="text-warning mb-1" />
                    <span className="text-[8px] font-bold text-text-2 uppercase tracking-wider">SOS</span>
                    <span className="text-[10px] font-semibold text-text-1 dark:text-white truncate w-full text-center">
                      {userProfile.emergencyContact || '—'}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="w-full flex gap-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 h-11 rounded-xl border border-border-md dark:border-white/10 text-[11px] font-semibold text-text-2 uppercase tracking-widest hover:bg-surface-2 dark:hover:bg-white/5 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 h-11 rounded-xl bg-brand text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-brand-dim transition-all shadow-md"
                  >
                    Share
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
