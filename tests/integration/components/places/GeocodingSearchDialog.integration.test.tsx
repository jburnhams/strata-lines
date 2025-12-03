import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeocodingSearchDialog } from '@/components/places/GeocodingSearchDialog';
import { getGeocodingService } from '@/services/geocodingService';
import type { GeocodingResult } from '@/services/geocoding/GeocodingProvider';
import '@testing-library/jest-dom';

// Mock the geocoding service module
jest.mock('@/services/geocodingService');

describe('GeocodingSearchDialog Integration', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectLocation = jest.fn();
  const mockSearchPlaces = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getGeocodingService as jest.Mock).mockReturnValue({
        searchPlaces: mockSearchPlaces
    });
  });

  it('should search and display results when user types', async () => {
    // Setup mock response
    const mockResults: GeocodingResult[] = [
      {
        latitude: 48.8566,
        longitude: 2.3522,
        displayName: 'Paris, France',
        locality: 'Paris',
        country: 'France'
      }
    ];
    mockSearchPlaces.mockResolvedValue(mockResults);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    // Find input and type
    const input = screen.getByPlaceholderText(/Type to search/i);
    fireEvent.change(input, { target: { value: 'Paris' } });

    // Wait for debounce and service call
    await waitFor(() => {
      expect(mockSearchPlaces).toHaveBeenCalledWith('Paris');
    }, { timeout: 2000 });

    // Verify result is displayed
    expect(await screen.findByText('Paris, France')).toBeInTheDocument();
  });

  it('should handle selection of a result', async () => {
    const mockResults: GeocodingResult[] = [
      {
        latitude: 51.5074,
        longitude: -0.1278,
        displayName: 'London, UK',
        locality: 'London',
        country: 'UK'
      }
    ];
    mockSearchPlaces.mockResolvedValue(mockResults);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    // Type query
    const input = screen.getByPlaceholderText(/Type to search/i);
    fireEvent.change(input, { target: { value: 'London' } });

    await waitFor(() => expect(mockSearchPlaces).toHaveBeenCalled());

    const resultItems = await screen.findAllByText('London, UK');
    fireEvent.click(resultItems[0]);

    // Verify callback
    expect(mockOnSelectLocation).toHaveBeenCalledWith(mockResults[0]);
  });
});
