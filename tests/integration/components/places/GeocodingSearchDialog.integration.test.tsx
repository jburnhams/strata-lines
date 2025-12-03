import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeocodingSearchDialog } from '@/components/places/GeocodingSearchDialog';
import { geocodingService } from '@/services/geocodingService';
import { GeocodingResult } from '@/services/geocoding/GeocodingProvider';
import '@testing-library/jest-dom';

// Mock the geocoding service
jest.mock('@/services/geocodingService', () => ({
  geocodingService: {
    searchPlaces: jest.fn(),
  },
}));

describe('GeocodingSearchDialog Integration', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectLocation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    (geocodingService.searchPlaces as jest.Mock).mockResolvedValue(mockResults);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    // Find input and type
    const input = screen.getByPlaceholderText('Search for a location...');
    fireEvent.change(input, { target: { value: 'Paris' } });

    // Wait for debounce and service call
    await waitFor(() => {
      expect(geocodingService.searchPlaces).toHaveBeenCalledWith('Paris');
    });

    // Verify result is displayed
    // Note: The component splits displayName for title, checks full displayName for subtitle
    expect(await screen.findByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Paris, France')).toBeInTheDocument();
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
    (geocodingService.searchPlaces as jest.Mock).mockResolvedValue(mockResults);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    // Type query
    const input = screen.getByPlaceholderText('Search for a location...');
    fireEvent.change(input, { target: { value: 'London' } });

    // Wait for result
    const resultItem = await screen.findByText('London, UK');

    // Click result
    fireEvent.click(resultItem);

    // Verify callback
    expect(mockOnSelectLocation).toHaveBeenCalledWith(mockResults[0]);
  });
});
