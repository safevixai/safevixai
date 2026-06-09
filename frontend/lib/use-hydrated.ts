'use client';

import { useState, useEffect } from 'react';

let _hydrated = false;
const _listeners = new Set<(v: boolean) => void>();

// Hook into Zustand persist onRehydrateStorage via manual subscribe
export function useHydrated() {
  const [hydrated, setHydrated] = useState(_hydrated);

  useEffect(() => {
    if (_hydrated) {
      setHydrated(true);
      return;
    }
    const listener = (v: boolean) => setHydrated(v);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  return hydrated;
}

/** Mark zustand persist hydration as complete (called once from the persist config) */
export function markHydrated() {
  _hydrated = true;
  _listeners.forEach((fn) => fn(true));
  _listeners.clear();
}
