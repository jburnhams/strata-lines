import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceSettingsPanel } from '@/components/places/PlaceSettingsPanel';

describe('PlaceSettingsPanel', () => {
  const mockTitleSizeChange = jest.fn();
  const mockToggleIcons = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings', () => {
    render(
      <PlaceSettingsPanel
        titleSize={50}
        onTitleSizeChange={mockTitleSizeChange}
        showIconsGlobally={true}
        onToggleIconsGlobally={mockToggleIcons}
      />
    );

    expect(screen.getByText('Place Settings')).toBeInTheDocument();
    expect(screen.getByText('Show Icons')).toBeInTheDocument();
    expect(screen.getByText('Title Size')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles icon toggle', () => {
    render(
      <PlaceSettingsPanel
        titleSize={50}
        onTitleSizeChange={mockTitleSizeChange}
        showIconsGlobally={true}
        onToggleIconsGlobally={mockToggleIcons}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockToggleIcons).toHaveBeenCalledWith(false);
  });

  it('handles size change', () => {
    render(
      <PlaceSettingsPanel
        titleSize={50}
        onTitleSizeChange={mockTitleSizeChange}
        showIconsGlobally={true}
        onToggleIconsGlobally={mockToggleIcons}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(mockTitleSizeChange).toHaveBeenCalledWith(75);
  });
});
