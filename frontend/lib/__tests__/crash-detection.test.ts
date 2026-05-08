import {
  simulateCrashDemo,
  startCrashDetection,
  stopCrashDetection,
} from '../crash-detection';
import { CRASH_DEBOUNCE_MS } from '../safety-constants';

describe('crash detection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as any).DeviceMotionEvent = function DeviceMotionEvent() {};
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete (globalThis as any).DeviceMotionEvent;
  });

  function dispatchMotion(accelerationIncludingGravity: { x: number; y: number; z: number }) {
    const event = new Event('devicemotion') as DeviceMotionEvent;
    Object.defineProperty(event, 'accelerationIncludingGravity', {
      value: accelerationIncludingGravity,
    });
    window.dispatchEvent(event);
  }

  it('fires once for a threshold-breaking g-force spike and debounces repeats', async () => {
    const onCrash = jest.fn();
    await startCrashDetection(onCrash);

    dispatchMotion({ x: 200, y: 0, z: 0 });
    dispatchMotion({ x: 200, y: 0, z: 0 });

    expect(onCrash).toHaveBeenCalledTimes(1);
    expect(onCrash.mock.calls[0][0]).toBeGreaterThan(100);

    jest.advanceTimersByTime(CRASH_DEBOUNCE_MS);
    dispatchMotion({ x: 200, y: 0, z: 0 });

    expect(onCrash).toHaveBeenCalledTimes(2);
    stopCrashDetection(onCrash);
  });

  it('supports a deterministic demo crash trigger', () => {
    const onCrash = jest.fn();
    void startCrashDetection(onCrash);

    simulateCrashDemo();

    expect(onCrash).toHaveBeenCalledTimes(1);
    stopCrashDetection(onCrash);
  });
});
