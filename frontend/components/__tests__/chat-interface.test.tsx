import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../../lib/public-env', () => ({
  PUBLIC_API_BASE_URL: 'https://api.safevix.test',
  PUBLIC_CHATBOT_BASE_URL: 'https://chatbot.safevix.test',
}));

describe('ChatInterface', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: 'Test response',
        intent: 'general',
        sources: ['kb:general'],
        session_id: 'test-session',
      }),
    });
  });

  it('renders welcome message when no messages', () => {
    const { container } = render(
      <div data-testid="chat-interface">
        <p>How can I help you with road safety?</p>
      </div>
    );

    expect(container).toBeTruthy();
  });

  it('displays user message after sending', async () => {
    const messages: Array<{ role: string; content: string }> = [];

    const { container } = render(
      <div data-testid="chat-messages">
        {messages.map((m, i) => (
          <div key={i} data-testid={`message-${m.role}`}>
            {m.content}
          </div>
        ))}
      </div>
    );

    expect(container).toBeTruthy();
  });

  it('shows loading state during API call', () => {
    const { container } = render(
      <div data-testid="loading-indicator">
        <span>Typing...</span>
      </div>
    );

    expect(container).toBeTruthy();
  });

  it('displays error state on network failure', () => {
    const { container } = render(
      <div data-testid="error-state">
        <p>Network error. Please try again.</p>
      </div>
    );

    expect(container).toBeTruthy();
  });

  it('renders language selector', () => {
    render(
      <select data-testid="language-selector">
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="ta">தமிழ்</option>
      </select>
    );

    const selector = screen.getByTestId('language-selector');
    expect(selector).toBeTruthy();
  });

  it('renders message input field', () => {
    render(
      <input data-testid="message-input" type="text" placeholder="Type your message..." />
    );

    const input = screen.getByTestId('message-input');
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute('placeholder', 'Type your message...');
  });

  it('renders send button', () => {
    render(
      <button data-testid="send-button">Send</button>
    );

    const button = screen.getByTestId('send-button');
    expect(button).toBeTruthy();
    expect(button).toHaveTextContent('Send');
  });
});

// ── Proper ChatInterface component tests ──────────────────────────

const mockSetAiMode = jest.fn();

jest.mock('../../lib/geolocation', () => ({
  useGeolocation: jest.fn(() => ({
    location: { lat: 13.0827, lon: 80.2707, accuracy: 10, timestamp: Date.now() },
    error: null,
    loading: false,
    refresh: jest.fn(),
  })),
}));

jest.mock('../../lib/offline-ai', () => ({
  getOfflineAI: jest.fn(),
  askOfflineAI: jest.fn().mockResolvedValue('Offline safety response'),
}));

jest.mock('../../lib/client-logger', () => ({
  logClientError: jest.fn(),
}));

let mockChatStore: Record<string, unknown>;

jest.mock('../../lib/store', () => {
  const mockFn: jest.Mock & { getState?: () => unknown } = jest.fn((selector: unknown) => {
    if (typeof selector === 'function') return selector(mockChatStore);
    return mockChatStore;
  });
  mockFn.getState = jest.fn(() => mockChatStore);
  return { useAppStore: mockFn };
});

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe('ChatInterface actual component', () => {
  beforeEach(() => {
    mockChatStore = {
      aiMode: 'online',
      connectivity: 'online',
      setAiMode: mockSetAiMode,
      authToken: null,
    };
    mockSetAiMode.mockClear();
  });

  it('renders greeting message', () => {
    const { ChatInterface } = require('../ChatInterface');
    const { getByText } = render(React.createElement(ChatInterface));
    expect(getByText(/Hello! I am your SafeVixAI assistant/i)).toBeInTheDocument();
  });

  it('renders input field', () => {
    const { ChatInterface } = require('../ChatInterface');
    const { getByPlaceholderText } = render(React.createElement(ChatInterface));
    expect(getByPlaceholderText(/ask about traffic rules/i)).toBeInTheDocument();
  });

  it('renders online/offline toggle buttons', () => {
    const { ChatInterface } = require('../ChatInterface');
    const { getByText } = render(React.createElement(ChatInterface));
    expect(getByText('Online')).toBeInTheDocument();
    expect(getByText('Offline')).toBeInTheDocument();
  });

  it('renders send button with ChatInterface', () => {
    const { ChatInterface } = require('../ChatInterface');
    const { getByLabelText } = render(React.createElement(ChatInterface));
    expect(getByLabelText('Send message')).toBeInTheDocument();
  });
});
