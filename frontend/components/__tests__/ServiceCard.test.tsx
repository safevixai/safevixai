import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServiceCard } from '../ServiceCard';

const mockService = {
  id: '1',
  name: 'Apollo Hospital',
  category: 'hospital' as const,
  lat: 13.0827,
  lon: 80.2707,
  distance: 1500,
  phone: '+911234567890',
  source: 'api' as const,
};

describe('ServiceCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders service name', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText('Apollo Hospital')).toBeInTheDocument();
  });

  it('renders category label', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText('Hospital')).toBeInTheDocument();
  });

  it('renders formatted distance in km', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText('1.5 km')).toBeInTheDocument();
  });

  it('renders distance in metres when < 1km', () => {
    const nearbyService = { ...mockService, distance: 500 };
    render(<ServiceCard service={nearbyService} />);
    expect(screen.getByText('500 m')).toBeInTheDocument();
  });

  it('renders distance 0m', () => {
    const nearbyService = { ...mockService, distance: 0 };
    render(<ServiceCard service={nearbyService} />);
    expect(screen.getByText('0 m')).toBeInTheDocument();
  });

  it('renders phone call link when phone is provided', () => {
    render(<ServiceCard service={mockService} />);
    const callLink = screen.getByLabelText('Call Apollo Hospital: +911234567890');
    expect(callLink).toBeInTheDocument();
    expect(callLink).toHaveAttribute('href', 'tel:+911234567890');
  });

  it('does not render call link when phone is missing', () => {
    const noPhoneService = { ...mockService, phone: undefined };
    render(<ServiceCard service={noPhoneService} />);
    expect(screen.queryByText('Call')).not.toBeInTheDocument();
  });

  it('renders directions button', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByLabelText('Get directions to Apollo Hospital')).toBeInTheDocument();
  });

  it('renders offline source indicator', () => {
    const offlineService = { ...mockService, source: 'offline' as const };
    const { container } = render(<ServiceCard service={offlineService} />);
    expect(container.textContent).toContain('offline cache');
  });

  it('does not show offline indicator for api source', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.queryByText('offline cache')).not.toBeInTheDocument();
  });

  it('has role article with aria-label', () => {
    render(<ServiceCard service={mockService} />);
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', 'Apollo Hospital');
  });

  it('renders nav app chooser button', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByLabelText('Choose navigation app')).toBeInTheDocument();
  });

  it('shows nav app dropdown on chooser click', () => {
    render(<ServiceCard service={mockService} />);
    fireEvent.click(screen.getByLabelText('Choose navigation app'));
    expect(screen.getByText('Google Maps')).toBeInTheDocument();
    expect(screen.getByText('Waze')).toBeInTheDocument();
    expect(screen.getByText('Apple Maps')).toBeInTheDocument();
  });

  it('hides dropdown on second chooser click', () => {
    render(<ServiceCard service={mockService} />);
    const chooser = screen.getByLabelText('Choose navigation app');
    fireEvent.click(chooser);
    expect(screen.getByText('Google Maps')).toBeInTheDocument();
    fireEvent.click(chooser);
    expect(screen.queryByText('Google Maps')).not.toBeInTheDocument();
  });

  it('renders all category labels', () => {
    const categories = [
      { category: 'ambulance' as const, label: 'Ambulance' },
      { category: 'police' as const, label: 'Police Station' },
      { category: 'fire' as const, label: 'Fire Station' },
      { category: 'towing' as const, label: 'Towing Service' },
      { category: 'pharmacy' as const, label: 'Pharmacy' },
      { category: 'puncture' as const, label: 'Puncture Shop' },
      { category: 'showroom' as const, label: 'Showroom' },
    ];
    for (const { category, label } of categories) {
      const { unmount } = render(<ServiceCard service={{ ...mockService, category }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('applies custom className', () => {
    const { container } = render(<ServiceCard service={mockService} className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
