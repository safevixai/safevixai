// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
jest.mock('../store', function () {
  return {
    useAppStore: { getState: jest.fn() },
  }
})

var mockGetState = require('../store').useAppStore.getState
var mockFetch = jest.fn()
global.fetch = mockFetch

// JSDOM may not have geolocation
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
    navigator.geolocation.getCurrentPosition = jest.fn()
    var mod = await import('../live-tracking')
    var stop = mod.beginLocationBroadcast('session-1')
    expect(typeof stop).toBe('function')
    stop()
  })

  // ── subscribeToTracking ──

  it('subscribeToTracking returns a stop function', async function () {
    var mod = await import('../live-tracking')
    var stop = mod.subscribeToTracking('session-1', 'token', jest.fn(), jest.fn())
    expect(typeof stop).toBe('function')
    stop()
  })

  it('subscribeToTracking calls onExpired on 404', async function () {
    mockFetch.mockResolvedValueOnce({ status: 404 })
    var mod = await import('../live-tracking')
    var onExpired = jest.fn()
    var onUpdate = jest.fn()
    var stop = mod.subscribeToTracking('session-1', 'token', onUpdate, onExpired, 0)
    await new Promise(function (resolve) { return setTimeout(resolve, 10) })
    expect(onExpired).toHaveBeenCalled()
    stop()
  })

  it('subscribeToTracking calls onExpired when not active', async function () {
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
    var mod = await import('../live-tracking')
    var onExpired = jest.fn()
    var onUpdate = jest.fn()
    var stop = mod.subscribeToTracking('session-1', 'token', onUpdate, onExpired, 0)
    await new Promise(function (resolve) { return setTimeout(resolve, 10) })
    expect(onExpired).toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
    stop()
  })

  it('subscribeToTracking calls onUpdate with location data', async function () {
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
    var mod = await import('../live-tracking')
    var onUpdate = jest.fn()
    var stop = mod.subscribeToTracking('session-1', 'token', onUpdate, jest.fn(), 0)
    await new Promise(function (resolve) { return setTimeout(resolve, 10) })
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ latitude: 13.08 }))
    stop()
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
})
