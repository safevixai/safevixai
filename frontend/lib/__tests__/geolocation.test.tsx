import { renderHook, waitFor } from '@testing-library/react';
import { useGeolocation } from '../geolocation';
import { useAppStore } from '../store';

function setBrowserLocationSupport({
  geolocation,
  permissionState,
}: {
  geolocation?: Partial<Geolocation> | null;
  permissionState?: PermissionState;
}) {
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: geolocation === undefined ? null : geolocation,
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value:
      permissionState == null
        ? undefined
        : {
            query: jest.fn().mockResolvedValue({ state: permissionState }),
          },
  });
}

describe('useGeolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      gpsLocation: null,
      gpsError: null,
    });
  });

  it('reports unsupported browsers clearly', async () => {
    setBrowserLocationSupport({ geolocation: null });

    renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(useAppStore.getState().gpsError).toBe('Geolocation not supported by your browser.');
    });
  });

  it('reports denied browser permission clearly', async () => {
    setBrowserLocationSupport({
      permissionState: 'denied',
      geolocation: {
        clearWatch: jest.fn(),
      },
    });

    renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(useAppStore.getState().gpsError).toBe(
        'Location permission is blocked in the browser. Enable it and retry.'
      );
    });
  });

  it('reports geolocation timeout clearly', async () => {
    const timeoutError = { code: 3 } as GeolocationPositionError;
    setBrowserLocationSupport({
      geolocation: {
        getCurrentPosition: jest.fn((_success, error) => error?.(timeoutError)),
        watchPosition: jest.fn((_success, error) => {
          error?.(timeoutError);
          return 42;
        }),
        clearWatch: jest.fn(),
      },
    });

    renderHook(() => useGeolocation());

    await waitFor(() => {
      expect(useAppStore.getState().gpsError).toBe('Location request timed out. Please try again.');
    });
  });
});
