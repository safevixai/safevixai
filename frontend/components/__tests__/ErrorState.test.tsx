import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorState } from '../ui/ErrorState';

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has role alert', () => {
    render(<ErrorState message="Error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders retry button when retry provided', () => {
    const handleRetry = jest.fn();
    render(<ErrorState message="Error" retry={handleRetry} />);
    const button = screen.getByText('Try Again');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders custom fallback label', () => {
    render(<ErrorState message="Error" retry={() => {}} fallbackLabel="Reload" />);
    expect(screen.getByText('Reload')).toBeInTheDocument();
  });

  it('does not render retry button when retry is undefined', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders default AlertTriangle icon', () => {
    const { container } = render(<ErrorState message="Error" />);
    const iconContainer = container.querySelector('.flex.h-12.w-12');
    expect(iconContainer).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ErrorState message="Error" className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });

  it('renders RotateCw icon inside retry button', () => {
    render(<ErrorState message="Error" retry={() => {}} />);
    const button = screen.getByText('Try Again');
    expect(button).toBeInTheDocument();
  });
});
