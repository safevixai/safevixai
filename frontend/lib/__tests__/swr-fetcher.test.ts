import { SWRConfig } from '../swr-fetcher';

describe('SWR Fetcher exports', () => {
  it('should export SWRConfig', () => {
    expect(SWRConfig).toBeDefined();
  });

  it('fetcher should be a function', async () => {
    const mod = await import('../swr-fetcher');
    expect(typeof mod.fetcher).toBe('function');
  });

  it('useEmergencyNumbers should be a function', async () => {
    const mod = await import('../swr-fetcher');
    expect(typeof mod.useEmergencyNumbers).toBe('function');
  });

  it('useEmergencyServices should be a function', async () => {
    const mod = await import('../swr-fetcher');
    expect(typeof mod.useEmergencyServices).toBe('function');
  });

  it('useRoadwatchFeed should be a function', async () => {
    const mod = await import('../swr-fetcher');
    expect(typeof mod.useRoadwatchFeed).toBe('function');
  });

  it('useChallanCalculation should be a function', async () => {
    const mod = await import('../swr-fetcher');
    expect(typeof mod.useChallanCalculation).toBe('function');
  });

  it('useUserProfile should be a function', async () => {
    const mod = await import('../swr-fetcher');
    expect(typeof mod.useUserProfile).toBe('function');
  });

  it('useFetchSos should be a function', async () => {
    const mod = await import('../swr-fetcher');
    expect(typeof mod.useFetchSos).toBe('function');
  });
});
