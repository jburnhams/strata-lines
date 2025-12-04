import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceSettingsPanel } from '@/components/places/PlaceSettingsPanel';

describe('PlaceSettingsPanel', () => {
  const mockTitleSizeChange = jest.fn();
  const mockToggleIcons = jest.fn();
  const mockToggleAutoCreate = jest.fn();
  const mockToggleLocality = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    titleSize: 50,
    onTitleSizeChange: mockTitleSizeChange,
    showIconsGlobally: true,
    onToggleIconsGlobally: mockToggleIcons,
    autoCreatePlaces: false,
    onToggleAutoCreatePlaces: mockToggleAutoCreate,
    defaultUseLocalityName: false,
    onToggleDefaultUseLocalityName: mockToggleLocality,
  };

  it('renders settings', () => {
    render(
      <PlaceSettingsPanel {...defaultProps} />
    );

    expect(screen.getByText('Place Settings')).toBeInTheDocument();
    expect(screen.getByText('Track Integration')).toBeInTheDocument();
    expect(screen.getByText('Show Icons')).toBeInTheDocument();
    expect(screen.getByText('Title Size')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles icon toggle', () => {
    render(
      <PlaceSettingsPanel {...defaultProps} />
    );

    const checkbox = screen.getByLabelText('Show Icons');
    fireEvent.click(checkbox);
    expect(mockToggleIcons).toHaveBeenCalledWith(false);
  });

  it('handles size change', () => {
    render(
      <PlaceSettingsPanel {...defaultProps} />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(mockTitleSizeChange).toHaveBeenCalledWith(75);
  });

  it('handles track integration toggles', () => {
    render(
      <PlaceSettingsPanel {...defaultProps} />
    );

    const autoCreate = screen.getByLabelText('Auto-create Places');
    fireEvent.click(autoCreate);
    expect(mockToggleAutoCreate).toHaveBeenCalledWith(true);

    const locality = screen.getByLabelText('Use Locality Names');
    fireEvent.click(locality);
    expect(mockToggleLocality).toHaveBeenCalledWith(true);
  });
});
