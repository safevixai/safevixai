import {
  PUBLIC_API_BASE_URL,
  PUBLIC_CHATBOT_BASE_URL,
  publicApiWebSocketUrl,
} from '../public-env';

describe('public-env', () => {
  describe('PUBLIC_API_BASE_URL', () => {
    it('reads from NEXT_PUBLIC_API_URL', () => {
      expect(PUBLIC_API_BASE_URL).toBe('http://localhost:8000');
    });

    it('does not have trailing slash', () => {
      expect(PUBLIC_API_BASE_URL).not.toMatch(/\/$/);
    });
  });

  describe('PUBLIC_CHATBOT_BASE_URL', () => {
    it('reads from NEXT_PUBLIC_CHATBOT_URL', () => {
      expect(PUBLIC_CHATBOT_BASE_URL).toBe('http://localhost:8010');
    });
  });

  describe('publicApiWebSocketUrl', () => {
    it('converts http to ws', () => {
      expect(publicApiWebSocketUrl('/test')).toBe('ws://localhost:8000/test');
    });

    it('handles path without leading slash', () => {
      expect(publicApiWebSocketUrl('chat/stream')).toBe(
        'ws://localhost:8000/chat/stream',
      );
    });

    it('preserves query parameters', () => {
      const url = publicApiWebSocketUrl('/tracking?group=abc');
      expect(url).toBe('ws://localhost:8000/tracking?group=abc');
    });

    it('removes hash fragment', () => {
      const url = publicApiWebSocketUrl('/path#section');
      expect(url).toBe('ws://localhost:8000/path');
    });
  });

  describe('error handling', () => {
    it('throws when required env vars are missing at module load', () => {
      const OLD_API = process.env.NEXT_PUBLIC_API_URL;
      const OLD_CHAT = process.env.NEXT_PUBLIC_CHATBOT_URL;
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_CHATBOT_URL;

      expect(() => {
        jest.isolateModules(() => {
          require('../public-env');
        });
      }).toThrow(/required/i);

      process.env.NEXT_PUBLIC_API_URL = OLD_API;
      process.env.NEXT_PUBLIC_CHATBOT_URL = OLD_CHAT;
    });
  });
});
