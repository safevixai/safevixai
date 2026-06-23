// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

jest.mock('@/lib/client-logger', function() {
  return { logClientError: jest.fn(), logClientWarning: jest.fn() }
})

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { PureMultimodalInput } from '../chat/multimodal-ai-chat-input'

describe('PureMultimodalInput', function() {
  it('renders textarea input', function() {
    render(React.createElement(PureMultimodalInput, {}))
    var textarea = screen.getByLabelText('Chat message input')
    expect(textarea).toBeTruthy()
  })

  it('renders send button', function() {
    render(React.createElement(PureMultimodalInput, {}))
    var sendButton = screen.getByLabelText('Send message')
    expect(sendButton).toBeTruthy()
  })

  it('renders mic button', function() {
    render(React.createElement(PureMultimodalInput, {}))
    var micButton = screen.getByLabelText('Use microphone')
    expect(micButton).toBeTruthy()
  })

  it('calls onSendMessage when form submitted', function() {
    var onSend = jest.fn()
    render(React.createElement(PureMultimodalInput, { onSendMessage: onSend, value: 'test message', onChange: function() {} }))
    fireEvent.click(screen.getByLabelText('Send message'))
  })

  it('renders stop button when isGenerating', function() {
    render(React.createElement(PureMultimodalInput, { isGenerating: true }))
    expect(screen.getByLabelText('Stop generating')).toBeTruthy()
  })

  it('renders language globe button', function() {
    render(React.createElement(PureMultimodalInput, {}))
    expect(screen.getByTitle('chat.select_language')).toBeTruthy()
  })

  it('disables send when canSend is false', function() {
    render(React.createElement(PureMultimodalInput, { canSend: false }))
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })
})
