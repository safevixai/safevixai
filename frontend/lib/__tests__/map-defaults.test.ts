// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
describe('map-defaults', function () {
  it('exports FALLBACK_MAP_CENTER as [lat, lon]', async function () {
    var mod = await import('../map-defaults')
    expect(Array.isArray(mod.FALLBACK_MAP_CENTER)).toBe(true)
    expect(mod.FALLBACK_MAP_CENTER).toHaveLength(2)
    expect(typeof mod.FALLBACK_MAP_CENTER[0]).toBe('number')
    expect(typeof mod.FALLBACK_MAP_CENTER[1]).toBe('number')
  })

  it('exports FALLBACK_MAP_ZOOM and LIVE_MAP_ZOOM as numbers', async function () {
    var mod = await import('../map-defaults')
    expect(typeof mod.FALLBACK_MAP_ZOOM).toBe('number')
    expect(typeof mod.LIVE_MAP_ZOOM).toBe('number')
  })
})
