// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

// frontend/hooks/useOfflineQueue.ts
// React hook wrapper around lib/offline-sos-queue.ts
// Provides reactive queue state and sync controls

import { useEffect, useState, useCallback } from 'react';
import { 
  enqueueSOS, 
  syncOfflineSOSQueue, 
  syncOfflineRoadReportQueue 
} from '@/lib/offline-sos-queue';
import { useAppStore } from '@/lib/store';

interface UseOfflineQueueReturn {
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Manually trigger a queue sync attempt for both SOS and road reports */
  triggerSync: () => Promise<void>;
  /** Enqueue an SOS item for offline replay */
  enqueueSosItem: (data: { lat: number; lon: number; authToken?: string; userId?: string; bloodGroup?: string; emergencyContacts?: string[] }) => Promise<void>;
}

/**
 * React hook for managing the offline SOS/report queue.
 * Automatically triggers sync when connectivity is restored.
 *
 * @example
 * ```tsx
 * const { isSyncing, triggerSync, enqueueSosItem } = useOfflineQueue();
 * ```
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const connectivity = useAppStore((state) => state.connectivity);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await Promise.allSettled([
        syncOfflineSOSQueue(),
        syncOfflineRoadReportQueue(),
      ]);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (connectivity === 'online') {
      triggerSync();
    }
  }, [connectivity]); // eslint-disable-line react-hooks/exhaustive-deps

  const enqueueSosItem = useCallback(async (data: { lat: number; lon: number; authToken?: string; userId?: string; bloodGroup?: string; emergencyContacts?: string[] }) => {
    await enqueueSOS(data);
  }, []);

  return { isSyncing, triggerSync, enqueueSosItem };
}
