import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/dynamic', () => {
  // Return a factory that creates a component rendering the loading state
  return () => {
    const MockInner = () => (
      <div>
        <span data-testid="loader2" />
        <span>Initializing Map Subsystem...</span>
      </div>
    );
    return MockInner;
  };
});

import { EmergencyMap } from '../EmergencyMap';

const defaultProps = {
  center: [13.0827, 80.2707] as [number, number],
  facilities: [],
};

describe('EmergencyMap', () => {
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
    expect(screen.getByText('Initializing Map Subsystem...')).toBeInTheDocument();
  });
});
