import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlaceSettingsPanel } from '@/components/places/PlaceSettingsPanel';

const mockHandlers = {
  onTitleSizeChange: jest.fn(),
  onToggleIconsGlobally: jest.fn(),
};

describe('PlaceSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings', () => {
    render(
      <PlaceSettingsPanel
        {...mockHandlers}
        titleSize={50}
        showIconsGlobally={true}
      />
    );

    expect(screen.getByText('Place Settings')).toBeInTheDocument();
    expect(screen.getByText('Title Size')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Show Icons Globally')).toBeInTheDocument();
  });

  it('changes title size', () => {
    render(
      <PlaceSettingsPanel
        {...mockHandlers}
        titleSize={50}
        showIconsGlobally={true}
      />
    );

    // input type="range" has implicit role="slider"
    // However, some implementations might vary. Let's try to query by display value if not found.
    // Actually, let's look for the input.
    const inputs = screen.getAllByRole('slider');
    const range = inputs[0];

    fireEvent.change(range, { target: { value: '75' } });
    expect(mockHandlers.onTitleSizeChange).toHaveBeenCalledWith(75);
  });

  it('toggles global icons', () => {
    render(
      <PlaceSettingsPanel
        {...mockHandlers}
        titleSize={50}
        showIconsGlobally={true}
      />
    );

    const checkbox = screen.getByLabelText('Show Icons Globally');
    fireEvent.click(checkbox);

    expect(mockHandlers.onToggleIconsGlobally).toHaveBeenCalledWith(false);
  });
});
