// frontend/hooks/useCrashDetection.ts
// React hook wrapper around lib/crash-detection.ts
// Provides a clean React lifecycle integration for crash detection

import { useEffect, useRef, useCallback } from 'react';
import { startCrashDetection, stopCrashDetection, simulateCrashDemo } from '@/lib/crash-detection';

interface UseCrashDetectionOptions {
  /** Callback when a crash is detected with the G-force magnitude */
  onCrashDetected: (force: number) => void;
  /** Whether crash detection is enabled (from settings) */
  enabled?: boolean;
}

/**
 * React hook that manages crash detection lifecycle.
 * Automatically starts/stops DeviceMotion monitoring based on the
 * `enabled` flag and cleans up on unmount.
 *
 * @example
 * ```tsx
 * const { simulateCrash } = useCrashDetection({
 *   onCrashDetected: (force) => showCrashCountdown(force),
 *   enabled: crashDetectionEnabled,
 * });
 * ```
 */
export function useCrashDetection({ onCrashDetected, enabled = true }: UseCrashDetectionOptions) {
  const callbackRef = useRef(onCrashDetected);
  callbackRef.current = onCrashDetected;

  // Stable callback that always references the latest onCrashDetected
  const stableCallback = useCallback((force: number) => {
    callbackRef.current(force);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    startCrashDetection(stableCallback);
    return () => {
      stopCrashDetection(stableCallback);
    };
  }, [enabled, stableCallback]);

  return {
    /** Simulate a crash for testing/demo purposes */
    simulateCrash: simulateCrashDemo,
  };
}
