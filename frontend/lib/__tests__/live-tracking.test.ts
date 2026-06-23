jest.mock('../store', function () {
  return {
    useAppStore: { getState: jest.fn() },
  }
})

var mockGetState = require('../store').useAppStore.getState
var mockFetch = jest.fn()
global.fetch = mockFetch

var origGeolocation = (navigator as any).geolocation

describe('live-tracking', function () {
  beforeAll(function () {
    if (!navigator.geolocation) {
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: jest.fn() },
        configurable: true,
        writable: true,
      })
    }
  })

  beforeEach(function () {
    mockGetState.mockReset()
    mockGetState.mockReturnValue({ authToken: 'test-token' })
    mockFetch.mockReset()
  })

  afterAll(function () {
    Object.defineProperty(navigator, 'geolocation', {
      value: origGeolocation,
      configurable: true,
    })
  })

  // ── startFamilyTracking ──

  it('startFamilyTracking POSTs to /live-tracking/start', async function () {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async function () { return { session_id: 'abc', tracking_url: 'http://t.co/abc', expires_at: '2026-07-01T00:00:00Z' } },
    })
    var mod = await import('../live-tracking')
    var result = await mod.startFamilyTracking({
      userName: 'Alice',
      latitude: 13.08,
      longitude: 80.27,
    })
    expect(result.session_id).toBe('abc')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/live-tracking/start'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('startFamilyTracking throws on non-ok response', async function () {
    mockFetch.mockResolvedValueOnce({ ok: false })
    var mod = await import('../live-tracking')
    await expect(mod.startFamilyTracking({
      userName: 'Alice',
      latitude: 13.08,
      longitude: 80.27,
    })).rejects.toThrow('Failed to start tracking session')
  })

  it('startFamilyTracking sends blood group and battery', async function () {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async function () { return { session_id: 'abc', tracking_url: 'http://t.co/abc', expires_at: '2026-07-01T00:00:00Z' } },
    })
    var mod = await import('../live-tracking')
    await mod.startFamilyTracking({
      userName: 'Bob',
      bloodGroup: 'O+',
      vehicleNumber: 'TN01AB1234',
      latitude: 12.97,
      longitude: 80.25,
      batteryPercent: 85,
    })
    var callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.blood_group).toBe('O+')
    expect(callBody.vehicle_number).toBe('TN01AB1234')
    expect(callBody.battery_percent).toBe(85)
  })

  // ── authHeaders ──

  it('authHeaders returns empty object when no token', async function () {
    mockGetState.mockReturnValue({ authToken: null })
    var mod = await import('../live-tracking')
    mockFetch.mockResolvedValueOnce({ ok: true, json: async function () { return {} } })
    await mod.startFamilyTracking({ userName: 'A', latitude: 0, longitude: 0 })
    var headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Authorization']).toBeUndefined()
  })

  // ── stopFamilyTracking ──

  it('stopFamilyTracking sends DELETE', async function () {
    mockFetch.mockResolvedValueOnce({ ok: true })
    var mod = await import('../live-tracking')
    await mod.stopFamilyTracking('session-1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/live-tracking/session/session-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('stopFamilyTracking does not throw on network error', async function () {
    mockFetch.mockRejectedValueOnce(new Error('network'))
    var mod = await import('../live-tracking')
    await expect(mod.stopFamilyTracking('session-1')).resolves.toBeUndefined()
  })

  // ── beginLocationBroadcast ──

  it('beginLocationBroadcast returns a stop function', async function () {
    (navigator.geolocation as any).getCurrentPosition = jest.fn()
    var mod = await import('../live-tracking')
    var stop = mod.beginLocationBroadcast('session-1')
    expect(typeof stop).toBe('function')
    stop()
  })

  it('beginLocationBroadcast pushes location', function (done) {
    jest.useFakeTimers()
    var mockGetCurrentPosition = jest.fn(function (success: Function) {
      success({
        coords: { latitude: 13.08, longitude: 80.27, accuracy: 10, speed: null },
        timestamp: Date.now(),
      })
    })
    ;(navigator as any).geolocation.getCurrentPosition = mockGetCurrentPosition
    ;(navigator as any).getBattery = jest.fn().mockResolvedValue({ level: 0.85 })

    mockFetch.mockResolvedValue({ ok: true })
    import('../live-tracking').then(function (mod) {
      var stop = mod.beginLocationBroadcast('session-abc')

      // Advance timers to allow push + interval to fire
      jest.advanceTimersByTime(100)

      setImmediate(function () {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/live-tracking/update'),
          expect.objectContaining({ method: 'PUT' }),
        )
        var body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body.latitude).toBe(13.08)
        expect(body.battery_percent).toBe(85)
        expect(body.session_id).toBe('session-abc')
        stop()
        jest.useRealTimers()
        done()
      })
    })
  })

  it('beginLocationBroadcast stops on 401', function (done) {
    var mockGetCurrentPosition = jest.fn(function (success: Function) {
      success({ coords: { latitude: 0, longitude: 0, accuracy: 0, speed: 0 }, timestamp: Date.now() })
    })
    ;(navigator as any).geolocation.getCurrentPosition = mockGetCurrentPosition
    ;(navigator as any).getBattery = jest.fn().mockResolvedValue({ level: 0.5 })

    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    import('../live-tracking').then(function (mod) {
      var stop = mod.beginLocationBroadcast('session-expired')

      setTimeout(function () {
        expect(mockFetch).toHaveBeenCalled()
        stop()
        done()
      }, 50)
    })
  })

  // ── subscribeToTracking ──

  it('subscribeToTracking returns a stop function', async function () {
    var mod = await import('../live-tracking')
    var stop = mod.subscribeToTracking('session-1', 'token', jest.fn(), jest.fn())
    expect(typeof stop).toBe('function')
    stop()
  })

  it('subscribeToTracking calls onExpired on 404', function (done) {
    mockFetch.mockResolvedValueOnce({ status: 404 })
    import('../live-tracking').then(function (mod) {
      var onExpired = jest.fn()
      var stop = mod.subscribeToTracking('session-1', 'token', jest.fn(), onExpired, 0)
      setTimeout(function () {
        expect(onExpired).toHaveBeenCalled()
        stop()
        done()
      }, 50)
    })
  })

  it('subscribeToTracking calls onExpired when not active', function (done) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async function () {
        return {
          session_id: 'session-1', user_name: 'Alice', blood_group: null,
          vehicle_number: null, latitude: 13.08, longitude: 80.27,
          accuracy: null, speed_kmh: null, battery_percent: null,
          is_active: false, updated_at: '2026-01-01T00:00:00Z',
        }
      },
    })
    import('../live-tracking').then(function (mod) {
      var onExpired = jest.fn()
      var onUpdate = jest.fn()
      var stop = mod.subscribeToTracking('session-1', 'token', onUpdate, onExpired, 0)
      setTimeout(function () {
        expect(onExpired).toHaveBeenCalled()
        expect(onUpdate).not.toHaveBeenCalled()
        stop()
        done()
      }, 50)
    })
  })

  it('subscribeToTracking calls onUpdate with location data', function (done) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async function () {
        return {
          session_id: 'session-1', user_name: 'Alice', blood_group: 'O+',
          vehicle_number: 'TN01AB1234', latitude: 13.08, longitude: 80.27,
          accuracy: 10, speed_kmh: 30, battery_percent: 80,
          is_active: true, updated_at: '2026-01-01T00:00:00Z',
        }
      },
    })
    import('../live-tracking').then(function (mod) {
      var onUpdate = jest.fn()
      var stop = mod.subscribeToTracking('session-1', 'token', onUpdate, jest.fn(), 0)
      setTimeout(function () {
        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ latitude: 13.08 }))
        stop()
        done()
      }, 50)
    })
  })

  it('subscribeToTracking handles network error', function (done) {
    mockFetch.mockRejectedValueOnce(new Error('network fail'))
    import('../live-tracking').then(function (mod) {
      var onUpdate = jest.fn()
      var stop = mod.subscribeToTracking('session-1', 'token', onUpdate, jest.fn(), 0)
      setTimeout(function () {
        expect(onUpdate).not.toHaveBeenCalled()
        stop()
        done()
      }, 50)
    })
  })

  // ── notifyContactsViaWhatsApp ──

  it('notifyContactsViaWhatsApp no-ops for empty contacts', async function () {
    var openMock = jest.fn()
    var windowOpen = window.open
    window.open = openMock
    var mod = await import('../live-tracking')
    mod.notifyContactsViaWhatsApp([], 'Alice', 'http://track.me')
    expect(openMock).not.toHaveBeenCalled()
    window.open = windowOpen
  })

  it('notifyContactsViaWhatsApp opens first contact immediately', async function () {
    var openMock = jest.fn()
    var windowOpen = window.open
    window.open = openMock
    var mod = await import('../live-tracking')
    mod.notifyContactsViaWhatsApp(['+919876543210'], 'Alice', 'http://track.me')
    expect(openMock).toHaveBeenCalledTimes(1)
    expect(openMock.mock.calls[0][0]).toContain('wa.me')
    expect(openMock.mock.calls[0][0]).toContain('919876543210')
    window.open = windowOpen
  })

  it('notifyContactsViaWhatsApp opens all contacts with delays', function (done) {
    jest.useFakeTimers()
    var openMock = jest.fn()
    var windowOpen = window.open
    window.open = openMock
    import('../live-tracking').then(function (mod) {
      mod.notifyContactsViaWhatsApp(['+919876543210', '+919111111111', '+919222222222'], 'Alice', 'http://track.me')
      expect(openMock).toHaveBeenCalledTimes(1)
      jest.advanceTimersByTime(1500)
      expect(openMock).toHaveBeenCalledTimes(2)
      jest.advanceTimersByTime(1500)
      expect(openMock).toHaveBeenCalledTimes(3)
      window.open = windowOpen
      jest.useRealTimers()
      done()
    })
  })

  it('notifyContactsViaWhatsApp validates invalid phone', async function () {
    var openMock = jest.fn()
    var windowOpen = window.open
    window.open = openMock
    var mod = await import('../live-tracking')
    mod.notifyContactsViaWhatsApp(['not-a-phone'], 'Alice', 'http://track.me')
    expect(openMock).not.toHaveBeenCalled()
    window.open = windowOpen
  })

  it('openEmergencyWhatsApp handles international formatted numbers', async function () {
    var openMock = jest.fn()
    var windowOpen = window.open
    window.open = openMock
    var mod = await import('../live-tracking')
    mod.notifyContactsViaWhatsApp(['+1 (555) 123-4567'], 'Alice', 'http://track.me')
    expect(openMock).toHaveBeenCalled()
    var url = openMock.mock.calls[0][0]
    expect(url).toContain('15551234567')
    window.open = windowOpen
  })
})
