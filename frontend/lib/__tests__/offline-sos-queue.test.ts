import { enqueueSOS, syncOfflineSOSQueue } from '../offline-sos-queue';
import { PUBLIC_API_BASE_URL } from '../public-env';

const mockAdd = jest.fn();
const mockGetAllKeys = jest.fn();
const mockGetAll = jest.fn();
const mockDelete = jest.fn();
const mockDone = Promise.resolve();

jest.mock('idb', () => ({
  openDB: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      add: mockAdd,
      transaction: jest.fn().mockImplementation(() => {
        return {
          store: {
            getAllKeys: mockGetAllKeys,
            getAll: mockGetAll,
            delete: mockDelete,
          },
          done: mockDone,
        };
      }),
    });
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Offline SOS Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdd.mockResolvedValue(undefined);
    
    // Simulate navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    
    // Setup fallback sessionStorage
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should enqueue SOS to IndexedDB if available', async () => {
    await enqueueSOS({ lat: 10, lon: 20 });
    expect(mockAdd).toHaveBeenCalledWith('sos-queue', expect.objectContaining({
      lat: 10,
      lon: 20,
      apiUrl: PUBLIC_API_BASE_URL,
    }));
  });

  it('should sync offline SOS requests when online', async () => {
    const mockItems = [{ lat: 10, lon: 20, apiUrl: PUBLIC_API_BASE_URL }];
    const mockKeys = [1];
    
    mockGetAllKeys.mockResolvedValue(mockKeys);
    mockGetAll.mockResolvedValue(mockItems);
    
    mockFetch.mockResolvedValue({ ok: true });
    
    await syncOfflineSOSQueue();
    
    expect(mockGetAll).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/emergency/sos?lat=10&lon=20'),
      expect.any(Object)
    );
    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it('should stop syncing if server rejects', async () => {
    const mockItems = [
      { lat: 10, lon: 20, apiUrl: PUBLIC_API_BASE_URL },
      { lat: 30, lon: 40, apiUrl: PUBLIC_API_BASE_URL }
    ];
    const mockKeys = [1, 2];
    
    mockGetAllKeys.mockResolvedValue(mockKeys);
    mockGetAll.mockResolvedValue(mockItems);
    
    mockFetch.mockResolvedValue({ ok: false }); // Fails
    
    await syncOfflineSOSQueue();
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should not sync if offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    
    await syncOfflineSOSQueue();
    expect(mockGetAll).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
