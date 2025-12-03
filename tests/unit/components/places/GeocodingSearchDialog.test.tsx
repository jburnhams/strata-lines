import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GeocodingSearchDialog from '@/components/places/GeocodingSearchDialog';
import { geocodingService } from '@/services/geocodingService';
import '@testing-library/jest-dom';

// Mock geocodingService
jest.mock('@/services/geocodingService', () => ({
  geocodingService: {
    searchPlaces: jest.fn(),
  },
}));

describe('GeocodingSearchDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectLocation = jest.fn();

  beforeEach(() => {
    mockOnClose.mockReset();
    mockOnSelectLocation.mockReset();
    (geocodingService.searchPlaces as jest.Mock).mockReset();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <GeocodingSearchDialog
        isOpen={false}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders when open', () => {
    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );
    expect(screen.getByPlaceholderText('Search for a location...')).toBeInTheDocument();
  });

  it('searches when typing', async () => {
    (geocodingService.searchPlaces as jest.Mock).mockResolvedValue([
      { displayName: 'Test Place', locality: 'City', latitude: 10, longitude: 20 },
    ]);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search for a location...'), {
      target: { value: 'Test' },
    });

    await waitFor(() => {
      expect(geocodingService.searchPlaces).toHaveBeenCalledWith('Test');
      expect(screen.getAllByText('Test Place')[0]).toBeInTheDocument();
    });
  });

  it('selects location on click', async () => {
    (geocodingService.searchPlaces as jest.Mock).mockResolvedValue([
      { displayName: 'Test Place', locality: 'City', latitude: 10, longitude: 20 },
    ]);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search for a location...'), {
      target: { value: 'Test' },
    });

    await waitFor(() => expect(screen.getAllByText('Test Place')[0]).toBeInTheDocument());

    fireEvent.click(screen.getAllByText('Test Place')[0]);

    expect(mockOnSelectLocation).toHaveBeenCalledWith(expect.objectContaining({
        displayName: 'Test Place'
    }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles empty results', async () => {
    (geocodingService.searchPlaces as jest.Mock).mockResolvedValue([]);

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search for a location...'), {
      target: { value: 'Unknown' },
    });

    await waitFor(() => {
        expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  it('handles search errors', async () => {
    (geocodingService.searchPlaces as jest.Mock).mockRejectedValue(new Error('Search failed'));

    render(
      <GeocodingSearchDialog
        isOpen={true}
        onClose={mockOnClose}
        onSelectLocation={mockOnSelectLocation}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search for a location...'), {
      target: { value: 'Error' },
    });

    await waitFor(() => {
        expect(screen.getByText('Failed to search.')).toBeInTheDocument();
    });
  });
});
