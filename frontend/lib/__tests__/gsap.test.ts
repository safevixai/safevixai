// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
describe('gsap', function () {
  it('exports gsap and ScrollTrigger', async function () {
    var mod = await import('../gsap')
    expect(mod.gsap).toBeDefined()
    expect(mod.ScrollTrigger).toBeDefined()
  })
})
