// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
describe('analytics', function () {
  it('exports initAnalyticsClient and track', async function () {
    var mod = await import('../analytics')
    expect(typeof mod.initAnalyticsClient).toBe('function')
    expect(typeof mod.track.sosActivated).toBe('function')
  })

  it('track.sosActivated calls safeCapture', async function () {
    var mod = await import('../analytics')
    var mockPh = { capture: jest.fn() }
    mod.initAnalyticsClient(mockPh)
    mod.track.sosActivated('manual')
    expect(mockPh.capture).toHaveBeenCalledWith('sos_activated', { method: 'manual' })
  })

  it('does not throw when no client initialized', async function () {
    var mod = await import('../analytics')
    expect(function () { mod.track.crashDetected('high', 12.5) }).not.toThrow()
    expect(function () { mod.track.crashCancelled(3) }).not.toThrow()
    expect(function () { mod.track.hospitalFound(5, 10, 'trauma') }).not.toThrow()
    expect(function () { mod.track.challanCalculated('TN', 'MVA_185', 5000, false) }).not.toThrow()
    expect(function () { mod.track.reportSubmitted('pothole', true, false) }).not.toThrow()
    expect(function () { mod.track.chatbotQueried('challan', 'groq') }).not.toThrow()
    expect(function () { mod.track.profileCompleted() }).not.toThrow()
    expect(function () { mod.track.offlineSosQueued() }).not.toThrow()
    expect(function () { mod.track.trackingShared('whatsapp') }).not.toThrow()
    expect(function () { mod.track.emergencyCallMade('112') }).not.toThrow()
    expect(function () { mod.track.firstAidViewed('burns') }).not.toThrow()
    expect(function () { mod.track.qrCardAction('share') }).not.toThrow()
    expect(function () { mod.track.pageViewed('/locator') }).not.toThrow()
    expect(function () { mod.track.integrationError('sentry', 'init_failed') }).not.toThrow()
    expect(function () { mod.track.pageLoadTiming() }).not.toThrow()
  })

  it('captures all event types when client set', async function () {
    var mockPh = { capture: jest.fn() }
    var mod = await import('../analytics')
    mod.initAnalyticsClient(mockPh)
    mod.track.crashDetected('severe', 25)
    expect(mockPh.capture).toHaveBeenCalledWith('crash_detected', { severity: 'severe', g_force: 25 })
    mod.track.hospitalFound(3, 5)
    expect(mockPh.capture).toHaveBeenCalledWith('hospital_found', { count: 3, radius_km: 5, filter: undefined })
  })
})
