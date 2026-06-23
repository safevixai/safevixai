// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
describe('navigation-launch', function () {
  beforeEach(function () {
    localStorage.clear()
  })

  it('openGoogleMaps creates correct URL', async function () {
    var mod = await import('../navigation-launch')
    var openSpy = jest.spyOn(window, 'open').mockImplementation(function () { return null })
    mod.openGoogleMaps({ lat: 13.08, lon: 80.27, name: 'Apollo' })
    var url = openSpy.mock.calls[0][0]
    expect(url).toContain('google.com/maps/dir')
    expect(url).toContain('13.08')
    expect(url).toContain('80.27')
    openSpy.mockRestore()
  })

  it('openWaze creates correct URL', async function () {
    var mod = await import('../navigation-launch')
    var openSpy = jest.spyOn(window, 'open').mockImplementation(function () { return null })
    mod.openWaze({ lat: 13.08, lon: 80.27 })
    var url = openSpy.mock.calls[0][0]
    expect(url).toContain('waze.com/ul')
    expect(url).toContain('navigate=yes')
    openSpy.mockRestore()
  })

  it('openAppleMaps creates correct URL', async function () {
    var mod = await import('../navigation-launch')
    var openSpy = jest.spyOn(window, 'open').mockImplementation(function () { return null })
    mod.openAppleMaps({ lat: 13.08, lon: 80.27, name: 'Hospital' })
    var url = openSpy.mock.calls[0][0]
    expect(url).toContain('maps.apple.com')
    expect(url).toContain('daddr=13.08')
    openSpy.mockRestore()
  })

  it('getPreferredNavApp returns google when no preference', async function () {
    var mod = await import('../navigation-launch')
    expect(mod.getPreferredNavApp()).toBe('google')
  })

  it('setPreferredNavApp saves and getPreferredNavApp retrieves', async function () {
    var mod = await import('../navigation-launch')
    mod.setPreferredNavApp('waze')
    expect(mod.getPreferredNavApp()).toBe('waze')
  })

  it('getPreferredNavApp returns google for invalid saved value', async function () {
    var mod = await import('../navigation-launch')
    localStorage.setItem('svai_preferred_nav_app', 'invalid')
    expect(mod.getPreferredNavApp()).toBe('google')
  })

  it('openBestNavApp calls correct launcher', async function () {
    var mod = await import('../navigation-launch')
    var openSpy = jest.spyOn(window, 'open').mockImplementation(function () { return null })
    mod.setPreferredNavApp('apple')
    mod.openBestNavApp({ lat: 10, lon: 20 })
    var url = openSpy.mock.calls[0][0]
    expect(url).toContain('maps.apple.com')
    openSpy.mockRestore()
  })

  it('openNavApp routes to correct app', async function () {
    var mod = await import('../navigation-launch')
    var openSpy = jest.spyOn(window, 'open').mockImplementation(function () { return null })
    mod.openNavApp('waze', { lat: 10, lon: 20 })
    expect(openSpy.mock.calls[0][0]).toContain('waze.com')
    openSpy.mockRestore()
  })

  it('NAV_APPS lists 3 apps', async function () {
    var mod = await import('../navigation-launch')
    expect(mod.NAV_APPS).toHaveLength(3)
  })
})
