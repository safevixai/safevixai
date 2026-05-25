import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurfaceCard } from '../ui/SurfaceCard';

describe('SurfaceCard', () => {
  it('renders children', () => {
    render(<SurfaceCard><span data-testid="child">content</span></SurfaceCard>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders text children', () => {
    render(<SurfaceCard>Hello World</SurfaceCard>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies standard variant by default', () => {
    const { container } = render(<SurfaceCard>content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('sv-card');
  });

  it('applies feature variant', () => {
    const { container } = render(<SurfaceCard variant="feature">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('sv-card-feature');
  });

  it('applies terminal variant', () => {
    const { container } = render(<SurfaceCard variant="terminal">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('rounded-panel');
    expect(container.firstChild).toHaveClass('shadow-card');
  });

  it('applies emergency variant', () => {
    const { container } = render(<SurfaceCard variant="emergency">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('sv-card-emergency');
  });

  it('applies profile variant', () => {
    const { container } = render(<SurfaceCard variant="profile">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('rounded-card');
    expect(container.firstChild).toHaveClass('border-border');
  });

  it('applies md padding by default', () => {
    const { container } = render(<SurfaceCard>content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('applies none padding', () => {
    const { container } = render(<SurfaceCard padding="none">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('p-0');
  });

  it('applies sm padding', () => {
    const { container } = render(<SurfaceCard padding="sm">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('p-3');
  });

  it('applies lg padding', () => {
    const { container } = render(<SurfaceCard padding="lg">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('p-5');
  });

  it('applies interactive class when interactive', () => {
    const { container } = render(<SurfaceCard interactive>content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('sv-card-interactive');
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('does not apply interactive class by default', () => {
    const { container } = render(<SurfaceCard>content</SurfaceCard>);
    expect(container.firstChild).not.toHaveClass('sv-card-interactive');
  });

  it('calls onClick when interactive and clicked', () => {
    const handleClick = jest.fn();
    render(<SurfaceCard interactive onClick={handleClick}>content</SurfaceCard>);
    fireEvent.click(screen.getByText('content'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(<SurfaceCard className="my-class">content</SurfaceCard>);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
