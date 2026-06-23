// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
var mockFileReader = jest.fn()
var mockImage = jest.fn()

var mockCreateElement = document.createElement.bind(document)

describe('validate-upload', function () {
  beforeEach(function () {
    mockFileReader.mockReset()
    mockImage.mockReset()
    document.createElement = mockCreateElement
  })

  afterAll(function () {
    document.createElement = mockCreateElement
  })

  // ── validateImageFile ──

  it('validateImageFile rejects unsupported type', async function () {
    var mod = await import('../validate-upload')
    var file = new File([''], 'test.gif', { type: 'image/gif' })
    var err = mod.validateImageFile(file)
    expect(err).toContain('Unsupported file type')
  })

  it('validateImageFile rejects oversized file', async function () {
    var mod = await import('../validate-upload')
    var file = new File(['x'.repeat(11 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' })
    var err = mod.validateImageFile(file)
    expect(err).toContain('exceeds the maximum upload size')
  })

  it('validateImageFile rejects empty file', async function () {
    var mod = await import('../validate-upload')
    var file = new File([''], 'test.jpg', { type: 'image/jpeg' })
    file = Object.defineProperty(file, 'size', { value: 0, writable: true }) as File
    var err = mod.validateImageFile(file)
    expect(err).toContain('empty')
  })

  it('validateImageFile returns null for valid file', async function () {
    var mod = await import('../validate-upload')
    var file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    var err = mod.validateImageFile(file)
    expect(err).toBeNull()
  })

  // ── compressImageFile ──

  it('compressImageFile resolves immediately for small files', async function () {
    var mod = await import('../validate-upload')
    var file = new File(['small'], 'test.jpg', { type: 'image/jpeg' })
    var result = await mod.compressImageFile(file, 1024 * 1024)
    expect(result).toBe(file)
  })

  it('compressImageFile falls back on FileReader error', async function () {
    var origFileReader = globalThis.FileReader
    globalThis.FileReader = jest.fn(function () {
      var reader = {
        onload: null,
        onerror: null,
        readAsDataURL: jest.fn(function () {
          setTimeout(function () { if (reader.onerror) reader.onerror(new Error('read failed')) }, 0)
        }),
      }
      return reader
    }) as any
    var mod = await import('../validate-upload')
    var file = new File(['x'.repeat(2 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' })
    var result = await mod.compressImageFile(file, 100)
    expect(result).toBe(file)
    globalThis.FileReader = origFileReader
  })

  it('validateImageFile accepts valid file', async function () {
    var mod = await import('../validate-upload')
    var file = new File(['test'], 'test.jpeg', { type: 'image/jpeg' })
    expect(mod.validateImageFile(file)).toBeNull()
    var webp = new File(['test'], 'test.webp', { type: 'image/webp' })
    expect(mod.validateImageFile(webp)).toBeNull()
    var png = new File(['test'], 'test.png', { type: 'image/png' })
    expect(mod.validateImageFile(png)).toBeNull()
  })
})
