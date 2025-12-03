import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GeocodingSearchDialog } from '@/components/places/GeocodingSearchDialog';
import { geocodingService } from '@/services/geocodingService';
import { GeocodingResult } from '@/services/geocoding/GeocodingProvider';

// Mock geocoding service
jest.mock('@/services/geocodingService', () => ({
  geocodingService: {
    searchPlaces: jest.fn()
  }
}));

describe('GeocodingSearchDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectLocation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <GeocodingSearchDialog
        isOpen={false}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders search input when open', () => {
    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );
    expect(screen.getByPlaceholderText('Search for a location...')).toBeInTheDocument();
  });

  it('performs search on input change with debounce', async () => {
    const mockResults: GeocodingResult[] = [{
      latitude: 10,
      longitude: 20,
      displayName: 'Test Place, Country',
      locality: 'Test Place',
      country: 'Country'
    }];

    (geocodingService.searchPlaces as jest.Mock).mockResolvedValue(mockResults);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    const input = screen.getByPlaceholderText('Search for a location...');
    fireEvent.change(input, { target: { value: 'Test' } });

    // Should not search immediately
    expect(geocodingService.searchPlaces).not.toHaveBeenCalled();

    // Advance timer to trigger debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(geocodingService.searchPlaces).toHaveBeenCalledWith('Test');

    await waitFor(() => {
      expect(screen.getByText('Test Place')).toBeInTheDocument();
    });
  });

  it('selects location on click', async () => {
    const mockResults: GeocodingResult[] = [{
      latitude: 10,
      longitude: 20,
      displayName: 'Test Place, Country',
      locality: 'Test Place',
      country: 'Country'
    }];
    (geocodingService.searchPlaces as jest.Mock).mockResolvedValue(mockResults);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    const input = screen.getByPlaceholderText('Search for a location...');
    fireEvent.change(input, { target: { value: 'Test' } });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      screen.getByText('Test Place');
    });

    fireEvent.click(screen.getByText('Test Place'));
    expect(mockOnSelectLocation).toHaveBeenCalledWith(mockResults[0]);
  });

  it('closes on escape key', () => {
    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    const input = screen.getByPlaceholderText('Search for a location...');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
