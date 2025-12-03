import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceSettingsPanel } from '@/components/places/PlaceSettingsPanel';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

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
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('changes title size', () => {
    render(
      <PlaceSettingsPanel
        titleSize={50}
        onTitleSizeChange={mockTitleSizeChange}
        showIconsGlobally={true}
        onToggleIconsGlobally={mockToggleIcons}
      />
    );

    // Using getAllByRole because sometimes there might be other inputs,
    // but here likely only one slider.
    // However, input type="range" maps to role="slider" in ARIA.
    // We can also use getByDisplayValue or label if available.
    // Let's try direct selector if getByRole is ambiguous.
    // But better to assume standard accessibility.

    // Actually, in the component: <input type="range" ... />.
    // It doesn't have an aria-label, but it has a visible label preceding it.
    // "Title Size"

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(mockTitleSizeChange).toHaveBeenCalledWith(75);
  });

  it('toggles icons', () => {
    render(
      <PlaceSettingsPanel
        titleSize={50}
        onTitleSizeChange={mockTitleSizeChange}
        showIconsGlobally={true}
        onToggleIconsGlobally={mockToggleIcons}
      />
    );

    const checkbox = screen.getByLabelText('Show Icons Globally');
    fireEvent.click(checkbox);
    expect(mockToggleIcons).toHaveBeenCalledWith(false);
  });
});
