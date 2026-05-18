'use client';

import { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { useAppStore } from '@/lib/store';
import { gsap } from '@/lib/gsap';
import { ProgressRing } from './ProgressRing';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';

interface CrashCountdownProps {
  severity: string;
  onCancel: () => void;
  onDispatch: () => void;
}

export function CrashCountdown({ severity, onCancel, onDispatch }: CrashCountdownProps) {
  const [seconds, setSeconds] = useState(20);
  const userProfile = useAppStore((state) => state.userProfile);
  const soundsEnabled = useAppStore((state) => state.soundsEnabled);
  const dispatched = useRef(false);
  const numRef = useRef<HTMLParagraphElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Initial haptic + entry animation
  useGSAP(() => {
    haptics.sos();

    if (cancelBtnRef.current) {
      gsap.fromTo(cancelBtnRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.3, ease: 'power2.out' }
      );
    }
  }, { scope: bgRef });

  // Countdown timer
  useEffect(() => {
    const t = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1 && !dispatched.current) {
          dispatched.current = true;
          onDispatch();
          clearInterval(t);
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDispatch]);

  // GSAP animations per second tick
  useGSAP(() => {
    if (!numRef.current) return;

    // Number flips down - like a mechanical counter
    gsap.fromTo(numRef.current,
      { opacity: 0, y: -20, scale: 1.1 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power3.out' }
    );

    // Background gets more red/intense as count drops
    if (bgRef.current && seconds <= 10) {
      gsap.to(bgRef.current, {
        background: 'linear-gradient(135deg, #2D0808 0%, #4A0A0A 100%)',
        duration: 0.5
      });
    }

    // Flash effect for last 5 seconds
    if (bgRef.current && seconds <= 5) {
      gsap.to(bgRef.current, {
        opacity: 0.85, duration: 0.1,
        yoyo: true, repeat: 3
      });
      haptics.heavy();
    }

    // Sound tick
    if (soundsEnabled) {
      sounds.countdown(seconds);
    }
  }, { dependencies: [seconds, soundsEnabled], scope: bgRef });

  return (
    <div
      ref={bgRef}
      role="alertdialog"
      aria-live="assertive"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #1A0A0A 0%, #2D0808 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Severity badge */}
      <span
        className="sv-micro"
        style={{
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: 8,
        }}
      >
        {severity.toUpperCase()} CRASH DETECTED
      </span>

      {/* Countdown number - mechanical counter */}
      <p
        ref={numRef}
        aria-label={`${seconds} seconds to auto SOS`}
        className="crash-countdown-num"
        style={{
          fontSize: 96,
          fontWeight: 800,
          color: seconds <= 5 ? '#FF0000' : 'white',
          lineHeight: 1,
          margin: 0,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-mono)',
          transition: 'color 0.3s ease',
        }}
      >
        {seconds}
      </p>

      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, margin: '12px 0' }}>
        Emergency services will be called in {seconds}s
      </p>

      {/* User info */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>
          {userProfile.bloodGroup || 'Blood group not set'}
        </span>
        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>
          {userProfile.vehicleNumber || 'Vehicle not set'}
        </span>
      </div>

      {/* Cancel button - explicit language */}
      <button
        ref={cancelBtnRef}
        onClick={onCancel}
        autoFocus
        style={{
          padding: '16px 48px',
          background: 'white',
          color: '#991B1B',
          fontWeight: 700,
          fontSize: 16,
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          minWidth: 240,
          minHeight: 56,
        }}
      >
        I AM SAFE — CANCEL SOS
      </button>

      {/* Progress ring - GSAP animated */}
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <ProgressRing seconds={seconds} total={20} size={64} />
      </div>
    </div>
  );
}
