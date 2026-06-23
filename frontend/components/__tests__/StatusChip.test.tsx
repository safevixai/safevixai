// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusChip } from '../ui/StatusChip';

describe('StatusChip', function() {
  it('renders label text', function() {
    render(<StatusChip status="success" label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders all status types', function() {
    var statuses = ['success', 'warning', 'error', 'info', 'neutral'] as const;
    for (const status of statuses) {
      var { unmount } = render(<StatusChip status={status} label={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    }
  });

  it('renders with icon when provided', function() {
    render(<StatusChip status="info" label="Info" icon={<span data-testid="test-icon">*</span>} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('does not render icon wrapper when icon is not provided', function() {
    var { container } = render(<StatusChip status="info" label="Info" />);
    var spans = container.querySelectorAll('span');
    expect(spans.length).toBe(0);
  });

  it('renders sm size by default', function() {
    var { container } = render(<StatusChip status="success" label="Active" />);
    expect(container.firstChild).toHaveClass('text-micro');
    expect(container.firstChild).toHaveClass('px-2');
    expect(container.firstChild).toHaveClass('py-0.5');
  });

  it('renders md size when specified', function() {
    var { container } = render(<StatusChip status="warning" label="Warn" size="md" />);
    expect(container.firstChild).toHaveClass('text-caption');
    expect(container.firstChild).toHaveClass('px-2.5');
    expect(container.firstChild).toHaveClass('py-1');
  });

  it('has uppercase text', function() {
    var { container } = render(<StatusChip status="error" label="Error" />);
    expect(container.firstChild).toHaveClass('uppercase');
  });

  it('applies correct background for each status', function() {
    var { container: c1 } = render(<StatusChip status="success" label="S" />);
    expect(c1.firstChild).toHaveClass('bg-brand-dim');

    var { container: c2 } = render(<StatusChip status="error" label="E" />);
    expect(c2.firstChild).toHaveClass('bg-emergency-dim');
  });
});


