import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceControls } from '@/components/places/PlaceControls';
import GeocodingSearchDialog from '@/components/places/GeocodingSearchDialog';

jest.mock('@/components/Icons', () => ({
  PlusIcon: () => <div data-testid="plus-icon" />,
  EyeIcon: () => <div data-testid="eye-icon" />,
  EyeOffIcon: () => <div data-testid="eye-off-icon" />,
  TrashIcon: () => <div data-testid="trash-icon" />
}));

jest.mock('@/components/places/GeocodingSearchDialog', () => {
  return jest.fn((props) => {
    return props.isOpen ? (
      <div data-testid="geocoding-dialog">
        <button
          onClick={() => props.onSelectLocation({
            displayName: 'Test Place',
            locality: 'Test Locality',
            latitude: 10,
            longitude: 10
          })}
        >
          Select Location
        </button>
        <button onClick={props.onClose}>Close</button>
      </div>
    ) : null;
  });
});

describe('PlaceControls', () => {
  const mockAddPlace = jest.fn();
  const mockToggleAll = jest.fn();
  const mockDeleteAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders controls', () => {
    render(
      <PlaceControls
        onAddPlace={mockAddPlace}
        allPlacesVisible={true}
        onToggleAllVisibility={mockToggleAll}
        placeCount={5}
        onDeleteAll={mockDeleteAll}
      />
    );

    expect(screen.getByText('Add Place')).toBeInTheDocument();
    expect(screen.getByText('Hide All')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('opens dialog on Add Place click and calls onAddPlace when location selected', () => {
    render(
      <PlaceControls
        onAddPlace={mockAddPlace}
        allPlacesVisible={true}
        onToggleAllVisibility={mockToggleAll}
        placeCount={5}
        onDeleteAll={mockDeleteAll}
      />
    );

    fireEvent.click(screen.getByText('Add Place'));
    expect(screen.getByTestId('geocoding-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Select Location'));
    expect(mockAddPlace).toHaveBeenCalledWith(expect.objectContaining({
      locality: 'Test Locality'
    }));
  });

  it('toggles all visibility', () => {
    render(
      <PlaceControls
        onAddPlace={mockAddPlace}
        allPlacesVisible={true}
        onToggleAllVisibility={mockToggleAll}
        placeCount={5}
        onDeleteAll={mockDeleteAll}
      />
    );

    fireEvent.click(screen.getByText('Hide All').closest('button')!);
    expect(mockToggleAll).toHaveBeenCalledWith(false);
  });

  it('handles delete all workflow', () => {
    render(
      <PlaceControls
        onAddPlace={mockAddPlace}
        allPlacesVisible={true}
        onToggleAllVisibility={mockToggleAll}
        placeCount={5}
        onDeleteAll={mockDeleteAll}
      />
    );

    fireEvent.click(screen.getByText('Clear All').closest('button')!);

    // Confirmation should appear
    expect(screen.getByText('Are you sure you want to delete all places?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete All'));
    expect(mockDeleteAll).toHaveBeenCalled();
  });

  it('disables clear all when no places', () => {
    render(
      <PlaceControls
        onAddPlace={mockAddPlace}
        allPlacesVisible={true}
        onToggleAllVisibility={mockToggleAll}
        placeCount={0}
        onDeleteAll={mockDeleteAll}
      />
    );

    const clearButton = screen.getByText('Clear All').closest('button');
    expect(clearButton).toBeDisabled();
  });
});
