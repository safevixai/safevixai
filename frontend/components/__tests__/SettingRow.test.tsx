import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingRow } from '../ui/SettingRow';

describe('SettingRow', () => {
  it('renders label', () => {
    render(<SettingRow title="Speed Alert" />);
    expect(screen.getByText('Speed Alert')).toBeInTheDocument();
  });

  it('renders description below label', () => {
    render(<SettingRow title="Speed Alert" description="Alert when exceeding speed limit" />);
    expect(screen.getByText('Speed Alert')).toBeInTheDocument();
    expect(screen.getByText('Alert when exceeding speed limit')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<SettingRow title="Speed Alert" />);
    expect(screen.queryByText('Alert when exceeding speed limit')).not.toBeInTheDocument();
  });

  it('renders rightElement controls', () => {
    render(<SettingRow title="Notifications" rightElement={<span data-testid="control">toggle</span>} />);
    expect(screen.getByTestId('control')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<SettingRow title="Speed Alert" icon={<span data-testid="icon">*</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders rightElement when provided', () => {
    render(<SettingRow title="Speed Alert" rightElement={<span data-testid="right">arr</span>} />);
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('renders as div when no onClick provided', () => {
    const { container } = render(<SettingRow title="Speed Alert" />);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('renders as button when onClick provided', () => {
    const handleClick = jest.fn();
    const { container } = render(<SettingRow title="Speed Alert" onClick={handleClick} />);
    expect(container.firstChild?.nodeName).toBe('BUTTON');
  });

  it('calls onClick when clicked and onClick provided', () => {
    const handleClick = jest.fn();
    render(<SettingRow title="Speed Alert" onClick={handleClick} />);
    fireEvent.click(screen.getByText('Speed Alert'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies border-b class for separation', () => {
    const { container } = render(<SettingRow title="Speed Alert" />);
    expect(container.firstChild).toHaveClass('border-b');
  });
});
