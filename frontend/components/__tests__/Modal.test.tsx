import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '../ui/Modal';

describe('Modal', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">
        content
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when open is true', () => {
    render(<Modal open={true} onClose={() => {}} title="Test Modal">content</Modal>);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('has role dialog and aria-modal', () => {
    render(<Modal open={true} onClose={() => {}} title="Test">content</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Test');
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = jest.fn();
    render(<Modal open={true} onClose={handleClose} title="Test">content</Modal>);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay clicked', () => {
    const handleClose = jest.fn();
    render(<Modal open={true} onClose={handleClose} title="Test">content</Modal>);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when panel content clicked', () => {
    const handleClose = jest.fn();
    render(<Modal open={true} onClose={handleClose} title="Test">
      <span data-testid="inside">content</span>
    </Modal>);
    fireEvent.click(screen.getByTestId('inside'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const handleClose = jest.fn();
    render(<Modal open={true} onClose={handleClose} title="Test">content</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    render(<Modal open={true} onClose={() => {}} title="Test" footer={<button>Save</button>}>content</Modal>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not render footer section when not provided', () => {
    const { container } = render(<Modal open={true} onClose={() => {}} title="Test">content</Modal>);
    const footerBorderDivs = container.querySelectorAll('div.border-t');
    expect(footerBorderDivs.length).toBe(0);
  });

  it('renders sm size', () => {
    const { container } = render(<Modal open={true} onClose={() => {}} title="Test" size="sm">content</Modal>);
    const panel = container.querySelector('[class*="max-w-sm"]');
    expect(panel).toBeInTheDocument();
  });

  it('renders md size by default', () => {
    const { container } = render(<Modal open={true} onClose={() => {}} title="Test">content</Modal>);
    const panel = container.querySelector('[class*="max-w-md"]');
    expect(panel).toBeInTheDocument();
  });

  it('renders lg size', () => {
    const { container } = render(<Modal open={true} onClose={() => {}} title="Test" size="lg">content</Modal>);
    const panel = container.querySelector('[class*="max-w-lg"]');
    expect(panel).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Modal open={true} onClose={() => {}} title="Test">
      <div data-testid="child">child content</div>
    </Modal>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders close button with accessible label', () => {
    render(<Modal open={true} onClose={() => {}} title="Test">content</Modal>);
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('aria-label', 'Close');
  });

  it('removes event listeners on close', () => {
    const handleClose = jest.fn();
    const { rerender } = render(<Modal open={true} onClose={handleClose} title="Test">content</Modal>);
    rerender(<Modal open={false} onClose={handleClose} title="Test">content</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });
});
