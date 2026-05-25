import { FALLBACK_MAP_CENTER, FALLBACK_MAP_ZOOM, LIVE_MAP_ZOOM } from '../map-defaults';

describe('map-defaults', () => {
  it('uses default India center', () => {
    expect(FALLBACK_MAP_CENTER).toEqual([20.5937, 78.9629]);
  });

  it('FALLBACK_MAP_CENTER is a tuple of two numbers', () => {
    expect(FALLBACK_MAP_CENTER).toHaveLength(2);
    expect(typeof FALLBACK_MAP_CENTER[0]).toBe('number');
    expect(typeof FALLBACK_MAP_CENTER[1]).toBe('number');
  });

  it('FALLBACK_MAP_ZOOM is 5', () => {
    expect(FALLBACK_MAP_ZOOM).toBe(5);
  });

  it('LIVE_MAP_ZOOM is 13', () => {
    expect(LIVE_MAP_ZOOM).toBe(13);
  });

  describe('env var overrides', () => {
    const ORIG = {
      LAT: process.env.NEXT_PUBLIC_MAP_FALLBACK_LAT,
      LON: process.env.NEXT_PUBLIC_MAP_FALLBACK_LON,
      FALLBACK_ZOOM: process.env.NEXT_PUBLIC_MAP_FALLBACK_ZOOM,
      LIVE_ZOOM: process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM,
    };

    afterAll(() => {
      const setOrDelete = (key: string, val: string | undefined) => {
        if (val !== undefined) process.env[key] = val;
        else delete process.env[key];
      };
      setOrDelete('NEXT_PUBLIC_MAP_FALLBACK_LAT', ORIG.LAT);
      setOrDelete('NEXT_PUBLIC_MAP_FALLBACK_LON', ORIG.LON);
      setOrDelete('NEXT_PUBLIC_MAP_FALLBACK_ZOOM', ORIG.FALLBACK_ZOOM);
      setOrDelete('NEXT_PUBLIC_MAP_DEFAULT_ZOOM', ORIG.LIVE_ZOOM);
    });

    it('reads lat, lon, zoom from env vars', () => {
      process.env.NEXT_PUBLIC_MAP_FALLBACK_LAT = '12.97';
      process.env.NEXT_PUBLIC_MAP_FALLBACK_LON = '77.59';
      process.env.NEXT_PUBLIC_MAP_FALLBACK_ZOOM = '10';
      process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM = '15';
      jest.resetModules();

      const mod = require('../map-defaults');

      expect(mod.FALLBACK_MAP_CENTER).toEqual([12.97, 77.59]);
      expect(mod.FALLBACK_MAP_ZOOM).toBe(10);
      expect(mod.LIVE_MAP_ZOOM).toBe(15);
    });
  });
});
