import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockState = {
  userProfile: {
    name: 'John Doe',
    bloodGroup: 'O+',
    vehicleNumber: 'TN01AB1234',
    emergencyContact: '+91-9876543210',
  },
};
jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) => selector(mockState),
}));

describe('ProfileCard', () => {
  it('renders user name', async () => {
    const ProfileCard = (await import('../dashboard/ProfileCard')).default;
    render(<ProfileCard />);
    expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
  });

  it('shows avatar initials derived from name', async () => {
    const ProfileCard = (await import('../dashboard/ProfileCard')).default;
    render(<ProfileCard />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows blood group, vehicle number, and emergency contact', async () => {
    const ProfileCard = (await import('../dashboard/ProfileCard')).default;
    render(<ProfileCard />);
    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText('TN01AB1234')).toBeInTheDocument();
    expect(screen.getByText('+91-9876543210')).toBeInTheDocument();
  });

  it('shows verified emergency profile status when name exists', async () => {
    const ProfileCard = (await import('../dashboard/ProfileCard')).default;
    render(<ProfileCard />);
    expect(screen.getByText('Verified emergency profile')).toBeInTheDocument();
  });

  it('handles empty profile gracefully', async () => {
    mockState.userProfile = {
      name: '',
      bloodGroup: '',
      vehicleNumber: '',
      emergencyContact: '',
    };
    const ProfileCard = (await import('../dashboard/ProfileCard')).default;
    render(<ProfileCard />);
    expect(screen.getByText('EMERGENCY PROFILE')).toBeInTheDocument();
    expect(screen.getByText('Blood group')).toBeInTheDocument();
    expect(screen.getByText('Vehicle ID')).toBeInTheDocument();
    expect(screen.getByText('Emergency contact')).toBeInTheDocument();
  });

  it('shows complete profile prompt when name is empty', async () => {
    mockState.userProfile = {
      name: '',
      bloodGroup: '',
      vehicleNumber: '',
      emergencyContact: '',
    };
    const ProfileCard = (await import('../dashboard/ProfileCard')).default;
    render(<ProfileCard />);
    expect(screen.getByText('Complete profile for faster SOS dispatch')).toBeInTheDocument();
  });

  it('renders status button', async () => {
    mockState.userProfile = {
      name: 'Test User',
      bloodGroup: 'A+',
      vehicleNumber: '',
      emergencyContact: '',
    };
    const ProfileCard = (await import('../dashboard/ProfileCard')).default;
    render(<ProfileCard />);
    expect(screen.getByLabelText('Emergency profile status')).toBeInTheDocument();
  });
});
