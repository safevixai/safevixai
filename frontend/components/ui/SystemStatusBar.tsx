'use client';

import { useEffect, useState } from 'react';
import { PUBLIC_CHATBOT_BASE_URL } from '@/lib/public-env';

export function SystemStatusBar() {
  const [status, setStatus] = useState<'ok' | 'degraded' | 'down'>('ok');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        // Use available endpoint or generic fallback check
        const r = await fetch(`${PUBLIC_CHATBOT_BASE_URL}/speech/status`, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (!r.ok) {
          setStatus('degraded');
          setMessage('AI Core running on secondary backup providers');
        } else {
          setStatus('ok');
        }
      } catch {
        setStatus('down');
        setMessage('Server waking up — please wait 30 seconds');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'ok') return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-1.5 text-center text-xs font-bold shadow-md transition-all ${
        status === 'down'
          ? 'bg-red-500 text-white dark:bg-red-950 dark:text-red-200'
          : 'bg-brand text-white dark:bg-brand-light/10 dark:text-brand-light'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2">
        <span>{status === 'down' ? '⚠️' : 'ℹ️'}</span>
        <span>{message}</span>
      </span>
    </div>
  );
}
