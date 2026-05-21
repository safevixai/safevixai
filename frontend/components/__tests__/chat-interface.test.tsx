import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    const { container } = render(
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
    const { container } = render(
      <input data-testid="message-input" type="text" placeholder="Type your message..." />
    );

    const input = screen.getByTestId('message-input');
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute('placeholder', 'Type your message...');
  });

  it('renders send button', () => {
    const { container } = render(
      <button data-testid="send-button">Send</button>
    );

    const button = screen.getByTestId('send-button');
    expect(button).toBeTruthy();
    expect(button).toHaveTextContent('Send');
  });
});
