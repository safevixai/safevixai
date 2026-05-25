import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockDynamicImportFn = jest.fn();
let mockLoadingComponent: (() => JSX.Element) | null = null;

jest.mock('next/dynamic', () => {
  return (importFn: any, options: any) => {
    mockDynamicImportFn(importFn, options);
    if (options && options.loading) {
      mockLoadingComponent = options.loading;
      return options.loading;
    }
    return () => null;
  };
});

jest.mock('lucide-react', () => ({
  Loader2: (props: any) => <span data-testid="loader2" {...props} />,
}));

import { EmergencyMap } from '../EmergencyMap';

const defaultProps = {
  center: [13.0827, 80.2707] as [number, number],
  facilities: [],
};

describe('EmergencyMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDynamicImportFn.mockReset();
    mockLoadingComponent = null;
  });

  it('shows loading state with Loader2', () => {
    render(<EmergencyMap {...defaultProps} />);
    expect(screen.getByTestId('loader2')).toBeInTheDocument();
  });

  it('has Initializing Map Subsystem text', () => {
    render(<EmergencyMap {...defaultProps} />);
    expect(screen.getByText('Initializing Map Subsystem...')).toBeInTheDocument();
  });

  it('dynamically imports EmergencyMapInner', () => {
    render(<EmergencyMap {...defaultProps} />);
    expect(mockDynamicImportFn).toHaveBeenCalledTimes(1);
    const [importFn, options] = mockDynamicImportFn.mock.calls[0];
    expect(options.ssr).toBe(false);
    expect(typeof importFn).toBe('function');
  });
});
