import { render, waitFor } from '@testing-library/react';
import maplibregl from 'maplibre-gl';
import { MapLibreCanvas } from '../maps/MapLibreCanvas';

jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

jest.mock('@/lib/traffic-layer', () => ({
  addTrafficLayer: jest.fn(),
  toggleTrafficLayer: jest.fn(),
}));

jest.mock('@/lib/safe-spaces-layer', () => ({
  addSafeSpacesLayer: jest.fn(async () => undefined),
}));

jest.mock('@/lib/location-tracker', () => ({
  startLocationTracking: jest.fn(() => jest.requireMock('maplibre-gl').default.__stopLocationTracking),
}));

jest.mock('@/lib/client-logger', () => ({
  logClientError: jest.fn(),
}));

jest.mock('maplibre-gl', () => {
  const mapRemove = jest.fn();
  const markerRemove = jest.fn();
  const stopLocationTracking = jest.fn();
  const mapInstance = {
    addControl: jest.fn(),
    dragRotate: { disable: jest.fn() },
    touchZoomRotate: { disableRotation: jest.fn() },
    once: jest.fn((_event: string, callback: () => void) => {
      callback();
    }),
    on: jest.fn(),
    off: jest.fn(),
    remove: mapRemove,
    resize: jest.fn(),
    jumpTo: jest.fn(),
    setStyle: jest.fn(),
    isStyleLoaded: jest.fn(() => true),
    areTilesLoaded: jest.fn(() => true),
    getSource: jest.fn(() => undefined),
    addSource: jest.fn(),
    removeSource: jest.fn(),
    getLayer: jest.fn(() => undefined),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    setLayoutProperty: jest.fn(),
    easeTo: jest.fn(),
    fitBounds: jest.fn(),
    getCanvas: jest.fn(() => ({ style: { cursor: '' } })),
  };

  class MockMarker {
    setLngLat() {
      return this;
    }
    setPopup() {
      return this;
    }
    addTo() {
      return this;
    }
    remove = markerRemove;
  }

  class MockPopup {
    setDOMContent() {
      return this;
    }
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
  }

  class MockLngLatBounds {
    extend() {
      return this;
    }
  }

  const api = {
    __mapRemove: mapRemove,
    __markerRemove: markerRemove,
    __stopLocationTracking: stopLocationTracking,
    Map: jest.fn(() => mapInstance),
    NavigationControl: jest.fn(),
    Marker: MockMarker,
    Popup: MockPopup,
    LngLatBounds: MockLngLatBounds,
  };

  return {
    __esModule: true,
    default: api,
    ...api,
  };
});

describe('MapLibreCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes the map and geolocation watcher on unmount', async () => {
    const { unmount } = render(
      <MapLibreCanvas center={[13.0827, 80.2707]} currentLocation={null} />
    );

    const maplibreMock = maplibregl as typeof maplibregl & {
      __mapRemove: jest.Mock;
      __stopLocationTracking: jest.Mock;
      Map: jest.Mock;
    };

    await waitFor(() => expect(maplibreMock.Map).toHaveBeenCalledTimes(1));

    unmount();

    expect(maplibreMock.__mapRemove).toHaveBeenCalledTimes(1);
    expect(maplibreMock.__stopLocationTracking).toHaveBeenCalledTimes(1);
  });
});
