// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProgressBar } from '../ui/ProgressBar';

describe('ProgressBar', function() {
  it('renders with role progressbar', function() {
    render(<ProgressBar />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('has aria-valuenow for determinate variant', function() {
    render(<ProgressBar value={50} max={100} />);
    var bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
  });

  it('has aria-valuemin and aria-valuemax', function() {
    render(<ProgressBar />);
    var bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('computes correct percentage', function() {
    var { container } = render(<ProgressBar value={25} max={100} />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 25%');
  });

  it('clamps value to 0 minimum', function() {
    var { container } = render(<ProgressBar value={-10} max={100} />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 0%');
  });

  it('clamps value to max of 100%', function() {
    var { container } = render(<ProgressBar value={150} max={100} />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 100%');
  });

  it('handles value of 0', function() {
    var { container } = render(<ProgressBar value={0} max={100} />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 0%');
  });

  it('handles value equal to max', function() {
    var { container } = render(<ProgressBar value={100} max={100} />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 100%');
  });

  it('does not set aria-valuenow for indeterminate variant', function() {
    render(<ProgressBar variant="indeterminate" />);
    var bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('applies indeterminate class for indeterminate variant', function() {
    var { container } = render(<ProgressBar variant="indeterminate" />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveClass('animate-indeterminate');
    expect(filler).toHaveClass('w-1/2');
  });

  it('applies custom color', function() {
    var { container } = render(<ProgressBar value={50} color="#ff0000" />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('background-color: #ff0000');
  });

  it('applies custom className', function() {
    var { container } = render(<ProgressBar className="my-custom-class" />);
    var track = container.firstChild;
    expect(track).toHaveClass('my-custom-class');
  });

  it('handles NaN value gracefully', function() {
    var { container } = render(<ProgressBar value={NaN} max={100} />);
    var filler = container.querySelector('.h-full');
    expect(filler).toBeInTheDocument();
    expect(filler).toHaveAttribute('style');
  });

  it('handles custom max value', function() {
    var { container } = render(<ProgressBar value={75} max={300} />);
    var filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 25%');
  });
});


