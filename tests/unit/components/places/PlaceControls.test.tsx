import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlaceControls } from '@/components/places/PlaceControls';

const mockHandlers = {
  onAddPlace: jest.fn(),
  onToggleAllVisibility: jest.fn(),
  onDeleteAll: jest.fn(),
};

describe('PlaceControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('renders buttons', () => {
    render(
      <PlaceControls
        {...mockHandlers}
        allPlacesVisible={true}
        placeCount={5}
      />
    );

    expect(screen.getByText('Add Place')).toBeInTheDocument();
    expect(screen.getByTitle('Hide all places')).toBeInTheDocument();
    expect(screen.getByTitle('Delete all places')).toBeInTheDocument();
  });

  it('calls onAddPlace', () => {
    render(
      <PlaceControls
        {...mockHandlers}
        allPlacesVisible={true}
        placeCount={5}
      />
    );

    fireEvent.click(screen.getByText('Add Place'));
    expect(mockHandlers.onAddPlace).toHaveBeenCalled();
  });

  it('toggles visibility', () => {
    render(
      <PlaceControls
        {...mockHandlers}
        allPlacesVisible={true}
        placeCount={5}
      />
    );

    fireEvent.click(screen.getByTitle('Hide all places'));
    expect(mockHandlers.onToggleAllVisibility).toHaveBeenCalledWith(false);
  });

  it('deletes all with confirmation', () => {
    render(
      <PlaceControls
        {...mockHandlers}
        allPlacesVisible={true}
        placeCount={5}
      />
    );

    fireEvent.click(screen.getByTitle('Delete all places'));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandlers.onDeleteAll).toHaveBeenCalled();
  });

  it('does not delete if cancelled', () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    render(
      <PlaceControls
        {...mockHandlers}
        allPlacesVisible={true}
        placeCount={5}
      />
    );

    fireEvent.click(screen.getByTitle('Delete all places'));
    expect(mockHandlers.onDeleteAll).not.toHaveBeenCalled();
  });

  it('disables bulk actions when count is 0', () => {
     render(
      <PlaceControls
        {...mockHandlers}
        allPlacesVisible={true}
        placeCount={0}
      />
    );

    expect(screen.getByTitle('Hide all places')).toBeDisabled();
    expect(screen.getByTitle('Delete all places')).toBeDisabled();
  });
});
