// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
describe('deep-link', function () {
  describe('parseDeepLink', function () {
    it('parses lat and lon correctly', async function () {
      var mod = await import('../deep-link')
      var result = mod.parseDeepLink('https://example.com?lat=13.08&lon=80.27')
      expect(result.lat).toBe(13.08)
      expect(result.lon).toBe(80.27)
      expect(result.hasLocation).toBe(true)
    })

    it('returns null for invalid lat', async function () {
      var mod = await import('../deep-link')
      var result = mod.parseDeepLink('https://example.com?lat=999&lon=80.27')
      expect(result.lat).toBeNull()
      expect(result.hasLocation).toBe(false)
    })

    it('returns null for invalid lon', async function () {
      var mod = await import('../deep-link')
      var result = mod.parseDeepLink('https://example.com?lat=13.08&lon=999')
      expect(result.lon).toBeNull()
      expect(result.hasLocation).toBe(false)
    })

    it('parses mode', async function () {
      var mod = await import('../deep-link')
      expect(mod.parseDeepLink('https://example.com?mode=sos').mode).toBe('sos')
      expect(mod.parseDeepLink('https://example.com?mode=track').mode).toBe('track')
      expect(mod.parseDeepLink('https://example.com?mode=report').mode).toBe('report')
      expect(mod.parseDeepLink('https://example.com?mode=locator').mode).toBe('locator')
      expect(mod.parseDeepLink('https://example.com?mode=invalid').mode).toBeNull()
    })

    it('parses source', async function () {
      var mod = await import('../deep-link')
      expect(mod.parseDeepLink('https://example.com?source=share').source).toBe('share')
      expect(mod.parseDeepLink('https://example.com?source=deeplink').source).toBe('deeplink')
      expect(mod.parseDeepLink('https://example.com?source=qr').source).toBe('qr')
      expect(mod.parseDeepLink('https://example.com?source=shortcut').source).toBe('shortcut')
      expect(mod.parseDeepLink('https://example.com?source=unknown').source).toBeNull()
    })

    it('parses state and section', async function () {
      var mod = await import('../deep-link')
      var result = mod.parseDeepLink('https://example.com?state=TN&section=MVA_185')
      expect(result.state).toBe('TN')
      expect(result.section).toBe('MVA_185')
    })

    it('parses sessionId', async function () {
      var mod = await import('../deep-link')
      var result = mod.parseDeepLink('https://example.com?session=abc123')
      expect(result.sessionId).toBe('abc123')
    })

    it('returns nulls for missing params', async function () {
      var mod = await import('../deep-link')
      var result = mod.parseDeepLink('https://example.com')
      expect(result.lat).toBeNull()
      expect(result.lon).toBeNull()
      expect(result.mode).toBeNull()
      expect(result.source).toBeNull()
      expect(result.hasLocation).toBe(false)
    })
  })
})
