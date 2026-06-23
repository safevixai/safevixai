// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
describe('profile-storage', function () {
  it('openProfileDb opens database', async function () {
    var mod = await import('../profile-storage')
    var db = await mod.openProfileDb()
    expect(db).toBeDefined()
  })

  it('openProfileDb returns null when not browser', async function () {
    var origWindow = globalThis.window
    delete (globalThis as any).window
    jest.resetModules()
    var mod = await import('../profile-storage')
    var db = await mod.openProfileDb()
    expect(db).toBeNull()
    globalThis.window = origWindow
  })

  it('loadUserProfileFromIndexedDB returns null when not browser', async function () {
    var origWindow = globalThis.window
    delete (globalThis as any).window
    jest.resetModules()
    var mod = await import('../profile-storage')
    var result = await mod.loadUserProfileFromIndexedDB()
    expect(result).toBeNull()
    globalThis.window = origWindow
  })

  it('migrateUserProfileFromLocalStorage handles parse errors', async function () {
    var getItemMock = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid-json')
    var mod = await import('../profile-storage')
    await expect(mod.migrateUserProfileFromLocalStorage()).resolves.toBeUndefined()
    getItemMock.mockRestore()
  })

  it('exports all expected functions', async function () {
    var mod = await import('../profile-storage')
    expect(typeof mod.openProfileDb).toBe('function')
    expect(typeof mod.saveUserProfileToIndexedDB).toBe('function')
    expect(typeof mod.loadUserProfileFromIndexedDB).toBe('function')
    expect(typeof mod.migrateUserProfileFromLocalStorage).toBe('function')
  })
})
