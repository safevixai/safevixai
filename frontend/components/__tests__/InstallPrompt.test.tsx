import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('lucide-react', () => ({
  Download: (props: any) => <span data-testid="download-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
}));

import InstallPrompt from '../InstallPrompt';

async function triggerBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt') as any;
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'accepted' as const });
  await act(async () => {
    window.dispatchEvent(event);
  });
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders install prompt UI after beforeinstallprompt event', async () => {
    render(<InstallPrompt />);
    await triggerBeforeInstallPrompt();
    await waitFor(() => {
      expect(screen.getByText('Install SafeVixAI')).toBeInTheDocument();
    });
    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('shows PWA install messaging about offline access', async () => {
    render(<InstallPrompt />);
    await triggerBeforeInstallPrompt();
    await waitFor(() => {
      expect(screen.getByText(/Get offline access/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/faster loading/i)).toBeInTheDocument();
  });

  it('has dismiss button with correct aria-label', async () => {
    render(<InstallPrompt />);
    await triggerBeforeInstallPrompt();
    await waitFor(() => {
      const dismissBtn = screen.getByLabelText('Dismiss install prompt');
      expect(dismissBtn).toBeInTheDocument();
    });
  });

  it('renders Download icon in the prompt', async () => {
    render(<InstallPrompt />);
    await triggerBeforeInstallPrompt();
    await waitFor(() => {
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });
  });

  it('dismisses prompt when dismiss button is clicked', async () => {
    render(<InstallPrompt />);
    await triggerBeforeInstallPrompt();
    await waitFor(() => {
      expect(screen.getByText('Install SafeVixAI')).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Dismiss install prompt'));
    });
    await waitFor(() => {
      expect(screen.queryByText('Install SafeVixAI')).not.toBeInTheDocument();
    });
  });
});
