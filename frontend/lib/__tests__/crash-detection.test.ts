import { startCrashDetection, stopCrashDetection, requestCrashPermission } from '../crash-detection';
import { CRASH_THRESHOLD_G, STANDARD_GRAVITY_MS2 } from '../safety-constants';

describe('CrashDetector — Safety-Critical Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('CRASH_THRESHOLD_G must be >= 15 (not trigger on phone drop)', () => {
    expect(CRASH_THRESHOLD_G).toBeGreaterThanOrEqual(15);
  });

  it('should not throw when starting detection in Node env', async () => {
    const callback = jest.fn();
    await expect(startCrashDetection(callback)).resolves.toBeUndefined();
  });

  it('should not throw when stopping detection', () => {
    const callback = jest.fn();
    stopCrashDetection(callback);
  });

  it('CRASH_THRESHOLD_MS2 must be >= 15 * 9.81 = 147.15 m/s^2', () => {
    const threshold = CRASH_THRESHOLD_G * STANDARD_GRAVITY_MS2;
    expect(threshold).toBeGreaterThanOrEqual(147.15);
  });

  it('requestCrashPermission should return false in non-browser env', async () => {
    const result = await requestCrashPermission();
    expect(result).toBe(false);
  });

  it('should handle multiple start/stop cycles without error', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    await startCrashDetection(cb1);
    startCrashDetection(cb2);
    stopCrashDetection(cb1);
    stopCrashDetection(cb2);

    await startCrashDetection(cb1);
    stopCrashDetection(cb1);
  });
});
