// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
jest.mock('@/i18n/config/resources', function () {
  return {
    resources: {
      en: {
        common: function () { return Promise.resolve({ default: { hello: 'Hello' } }) },
      },
    },
  }
})

describe('i18n', function () {
  it('exports default i18n instance with t function', async function () {
    var mod = await import('../i18n')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default.t).toBe('function')
  })

  it('i18n init sets fallbackLng to en', async function () {
    var mod = await import('../i18n')
    expect(mod.default.options.fallbackLng).toEqual(['en'])
    expect(mod.default.options.defaultNS).toBe('common')
  })
})
