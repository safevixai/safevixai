'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
    if (result.outcome === 'accepted') {
      setDismissed(true);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md animate-slide-up">
      <div className="relative flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-[#0a0e1a]/95 backdrop-blur-xl px-4 py-3 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        <button
          onClick={() => { setVisible(false); setDismissed(true); }}
          className="absolute -top-2 -right-2 rounded-full bg-[#1a1f2e] p-0.5 text-zinc-400 hover:text-white transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
          <Download className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Install SafeVixAI</p>
          <p className="text-xs text-zinc-400">Get offline access &amp; faster loading</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
