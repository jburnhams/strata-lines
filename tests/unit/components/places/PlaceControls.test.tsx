import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceControls } from '@/components/places/PlaceControls';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

describe('PlaceControls', () => {
  const mockAddPlace = jest.fn();
  const mockToggleAll = jest.fn();
  const mockDeleteAll = jest.fn();

  let confirmSpy: any;

  beforeAll(() => {
    // Ensure window.confirm exists and is mockable
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => false);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
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
    expect(screen.getByTitle('Hide all places')).toBeInTheDocument();
  });

  it('calls add place', () => {
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
    expect(mockAddPlace).toHaveBeenCalled();
  });

  it('toggles visibility', () => {
    render(
      <PlaceControls
        onAddPlace={mockAddPlace}
        allPlacesVisible={true}
        onToggleAllVisibility={mockToggleAll}
        placeCount={5}
        onDeleteAll={mockDeleteAll}
      />
    );

    fireEvent.click(screen.getByTitle('Hide all places'));
    expect(mockToggleAll).toHaveBeenCalledWith(false);
  });

  it('handles delete all', () => {
    confirmSpy.mockReturnValue(true);
    render(
      <PlaceControls
        onAddPlace={mockAddPlace}
        allPlacesVisible={true}
        onToggleAllVisibility={mockToggleAll}
        placeCount={5}
        onDeleteAll={mockDeleteAll}
      />
    );

    fireEvent.click(screen.getByTitle('Delete all places'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteAll).toHaveBeenCalled();
  });
});
