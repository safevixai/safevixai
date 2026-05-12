'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

interface CrashCountdownProps {
  severity: string;
  onCancel: () => void;
  onDispatch: () => void;
}

export function CrashCountdown({ severity, onCancel, onDispatch }: CrashCountdownProps) {
  const [seconds, setSeconds] = useState(20);
  const userProfile = useAppStore((state) => state.userProfile);
  const dispatched = useRef(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
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

  return (
    <div
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
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: 8,
        }}
      >
        {severity.toUpperCase()} CRASH DETECTED
      </span>

      {/* Countdown number */}
      <p
        aria-label={`${seconds} seconds to auto SOS`}
        style={{
          fontSize: 96,
          fontWeight: 800,
          color: 'white',
          lineHeight: 1,
          margin: 0,
          fontVariantNumeric: 'tabular-nums',
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

      {/* Cancel button */}
      <button
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
        I AM SAFE — CANCEL
      </button>

      {/* Progress ring */}
      <svg style={{ position: 'absolute', top: 24, right: 24 }} width="48" height="48">
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="3"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 20}`}
          strokeDashoffset={`${2 * Math.PI * 20 * (1 - seconds / 20)}`}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s linear',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
      </svg>
    </div>
  );
}
