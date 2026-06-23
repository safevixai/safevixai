// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
jest.mock('idb', function () { return { openDB: jest.fn() } })
jest.mock('../supabase-auth', function () { return { getSupabaseBrowserClient: jest.fn() } })

var mockDb = { put: jest.fn(), getAllFromIndex: jest.fn() }
var mockOpenDB = require('idb').openDB
mockOpenDB.mockResolvedValue(mockDb)

var mockSupabase = {
  from: jest.fn(function () { return { select: jest.fn(function () { return { eq: jest.fn(function () { return { order: jest.fn(function () { return { data: null, error: null } }) } }) } }), insert: jest.fn(function () { return {} }) } })
}
var mockSupabaseAuth = require('../supabase-auth')
mockSupabaseAuth.getSupabaseBrowserClient.mockReturnValue(mockSupabase)

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'indexedDB', { value: {}, writable: true, configurable: true })
}

var ChatLog
beforeAll(async function () {
  var mod = await import('../chat-history')
  ChatLog = mod.ChatLog
})

describe('chat-history', function () {
  describe('loadChatHistory', function () {
    it('returns empty array when db not available', async function () {
      mockOpenDB.mockResolvedValueOnce(null)
      var result = await (await import('../chat-history')).loadChatHistory('session-1')
      expect(result).toEqual([])
    })
  })

  describe('appendChatLog', function () {
    it('handles db put call', async function () {
      var log = { id: '1', sessionId: 's1', role: 'user', text: 'hi', timestamp: 'now', createdAt: 'now' }
      await (await import('../chat-history')).appendChatLog(log)
      expect(mockDb.put).toHaveBeenCalled()
    })
  })
})
