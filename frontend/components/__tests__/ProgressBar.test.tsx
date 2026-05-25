import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProgressBar } from '../ui/ProgressBar';

describe('ProgressBar', () => {
  it('renders with role progressbar', () => {
    render(<ProgressBar />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('has aria-valuenow for determinate variant', () => {
    render(<ProgressBar value={50} max={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
  });

  it('has aria-valuemin and aria-valuemax', () => {
    render(<ProgressBar />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('computes correct percentage', () => {
    const { container } = render(<ProgressBar value={25} max={100} />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 25%');
  });

  it('clamps value to 0 minimum', () => {
    const { container } = render(<ProgressBar value={-10} max={100} />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 0%');
  });

  it('clamps value to max of 100%', () => {
    const { container } = render(<ProgressBar value={150} max={100} />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 100%');
  });

  it('handles value of 0', () => {
    const { container } = render(<ProgressBar value={0} max={100} />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 0%');
  });

  it('handles value equal to max', () => {
    const { container } = render(<ProgressBar value={100} max={100} />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 100%');
  });

  it('does not set aria-valuenow for indeterminate variant', () => {
    render(<ProgressBar variant="indeterminate" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('applies indeterminate class for indeterminate variant', () => {
    const { container } = render(<ProgressBar variant="indeterminate" />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveClass('animate-indeterminate');
    expect(filler).toHaveClass('w-1/2');
  });

  it('applies custom color', () => {
    const { container } = render(<ProgressBar value={50} color="#ff0000" />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('background-color: #ff0000');
  });

  it('applies custom className', () => {
    const { container } = render(<ProgressBar className="my-custom-class" />);
    const track = container.firstChild;
    expect(track).toHaveClass('my-custom-class');
  });

  it('handles NaN value gracefully', () => {
    const { container } = render(<ProgressBar value={NaN} max={100} />);
    const filler = container.querySelector('.h-full');
    expect(filler).toBeInTheDocument();
    expect(filler).toHaveAttribute('style');
  });

  it('handles custom max value', () => {
    const { container } = render(<ProgressBar value={75} max={300} />);
    const filler = container.querySelector('.h-full');
    expect(filler).toHaveStyle('width: 25%');
  });
});
