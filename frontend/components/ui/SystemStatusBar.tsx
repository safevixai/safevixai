'use client';

import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';

export function SystemStatusBar() {
  const [status, setStatus] = useState<'OPERATIONAL' | 'DEGRADED' | 'DOWN'>('OPERATIONAL');
  const [message, setMessage] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('svai-status-dismissed') === 'true';
      setIsDismissed(dismissed);
    }

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const r = await fetch(`/api/v1/system/status`, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (r.ok) {
          const data = await r.json();
          const overall = data?.status?.overall || data?.overall || 'OPERATIONAL';
          const msg = data?.status?.message || data?.message || 'System operating under backup protocols';
          setStatus(overall);
          setMessage(overall === 'DEGRADED' ? msg : 'Server waking up... (~30 seconds on first load)');
        } else {
          setStatus('DEGRADED');
          setMessage('AI Core running on secondary backup providers');
        }
      } catch {
        setStatus('DOWN');
        setMessage('Server waking up... (~30 seconds on first load)');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const active = status !== 'OPERATIONAL' && !isDismissed;

  useEffect(() => {
    if (active) {
      setShouldRender(true);
    }
  }, [active]);

  useGSAP(() => {
    if (!containerRef.current) return;
    if (active) {
      gsap.fromTo(
        containerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
    } else {
      gsap.to(containerRef.current, {
        y: -50,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => setShouldRender(false),
      });
    }
  }, { dependencies: [active] });

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('svai-status-dismissed', 'true');
    }
    setIsDismissed(true);
  };

  if (!shouldRender) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed top-0 left-0 right-0 z-[1000] px-4 py-2 text-center text-xs font-bold shadow-md flex items-center justify-between transition-all ${
        status === 'DOWN'
          ? 'bg-red-500 text-white dark:bg-red-950 dark:text-red-200'
          : 'bg-brand text-white dark:bg-brand-light/10 dark:text-brand-light'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex-1 flex items-center justify-center gap-2">
        <span>{status === 'DOWN' ? '⚠️' : 'ℹ️'}</span>
        <span>{message}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-white dark:text-inherit transition-colors"
        aria-label="Dismiss System Status"
      >
        <X size={14} />
      </button>
    </div>
  );
}
