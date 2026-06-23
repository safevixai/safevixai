// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
var mockFetch = jest.fn()
global.fetch = mockFetch

describe('india-locations', function () {
  beforeEach(function () {
    mockFetch.mockReset()
    jest.resetModules()
  })

  describe('getIndianStates', function () {
    it('returns states on successful API call', async function () {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async function () { return { data: { states: [{ name: 'Tamil Nadu' }, { name: 'Kerala' }] } } } })
      var mod = await import('../india-locations')
      var states = await mod.getIndianStates()
      expect(states).toEqual(['Kerala', 'Tamil Nadu'])
    })

    it('returns fallback states on API failure', async function () {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      var mod = await import('../india-locations')
      var states = await mod.getIndianStates()
      expect(states.length).toBeGreaterThanOrEqual(2)
    })

    it('returns fallback states on non-ok response', async function () {
      mockFetch.mockResolvedValueOnce({ ok: false })
      var mod = await import('../india-locations')
      var states = await mod.getIndianStates()
      expect(states.length).toBeGreaterThanOrEqual(2)
    })

    it('caches states after first call', async function () {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async function () { return { data: { states: [{ name: 'Goa' }] } } } })
      var mod = await import('../india-locations')
      await mod.getIndianStates()
      mockFetch.mockClear()
      var states = await mod.getIndianStates()
      expect(states).toEqual(['Goa'])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getCitiesForState', function () {
    it('returns cities on success', async function () {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async function () { return { data: ['Chennai', 'Coimbatore'] } } })
      var mod = await import('../india-locations')
      var cities = await mod.getCitiesForState('Tamil Nadu')
      expect(cities).toEqual(['Chennai', 'Coimbatore'])
    })

    it('returns empty array on failure', async function () {
      mockFetch.mockRejectedValueOnce(new Error('fail'))
      var mod = await import('../india-locations')
      var cities = await mod.getCitiesForState('Unknown')
      expect(cities).toEqual([])
    })
  })
})
