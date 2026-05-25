import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyState } from '../ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No Results" />);
    expect(screen.getByText('No Results')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing to see here" />);
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('renders action button when action provided', () => {
    const handleClick = jest.fn();
    render(<EmptyState title="Empty" action={{ label: 'Retry', onClick: handleClick }} />);
    const button = screen.getByText('Retry');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when action not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has role status and aria-label', () => {
    render(<EmptyState title="No Items" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'No Items');
  });

  it('renders default Inbox icon', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const iconContainer = container.querySelector('.flex.h-14.w-14');
    expect(iconContainer).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Empty" className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
