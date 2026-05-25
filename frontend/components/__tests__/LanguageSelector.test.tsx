import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = jest.fn();
const mockSetUserProfile = jest.fn();
const mockStore = {
  userProfile: { preferredLanguage: 'en' },
  setUserProfile: mockSetUserProfile,
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('lucide-react', () => ({
  Globe: () => <span data-testid="globe-icon" />,
}));

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) => selector(mockStore),
}));

import { LanguageSelector } from '../ui/LanguageSelector';

describe('LanguageSelector', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSetUserProfile.mockClear();
  });

  it('renders language options', () => {
    render(<LanguageSelector />);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('हिन्दी (Hindi)')).toBeInTheDocument();
    expect(screen.getByText('தமிழ் (Tamil)')).toBeInTheDocument();
  });

  it('has select with aria-label', () => {
    render(<LanguageSelector />);
    expect(screen.getByLabelText('Select preferred language')).toBeInTheDocument();
  });

  it('highlights current language', () => {
    render(<LanguageSelector />);
    const select = screen.getByLabelText('Select preferred language') as HTMLSelectElement;
    expect(select.value).toBe('en');
  });

  it('calls onChangeLanguage when selecting a language', () => {
    const handleChange = jest.fn();
    render(<LanguageSelector onChangeLanguage={handleChange} />);
    const select = screen.getByLabelText('Select preferred language');
    fireEvent.change(select, { target: { value: 'hi' } });
    expect(handleChange).toHaveBeenCalledWith('hi');
  });

  it('updates store when language changes', () => {
    render(<LanguageSelector />);
    const select = screen.getByLabelText('Select preferred language');
    fireEvent.change(select, { target: { value: 'ta' } });
    expect(mockSetUserProfile).toHaveBeenCalledWith({ preferredLanguage: 'ta' });
  });

  it('renders globe icon', () => {
    render(<LanguageSelector />);
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LanguageSelector className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
