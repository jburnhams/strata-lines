import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeocodingSearchDialog } from '@/components/places/GeocodingSearchDialog';
import * as geocodingServiceModule from '@/services/geocodingService';
import type { GeocodingResult } from '@/services/geocoding/GeocodingProvider';

jest.mock('@/services/geocodingService');
jest.mock('@/components/Icons', () => ({
    XIcon: () => <svg data-testid="x-icon" />
}));

describe('GeocodingSearchDialog', () => {
    const mockSearchPlaces = jest.fn();
    const mockOnClose = jest.fn();
    const mockOnSelectLocation = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        (geocodingServiceModule.getGeocodingService as jest.Mock).mockReturnValue({
            searchPlaces: mockSearchPlaces
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders when open', () => {
        render(<GeocodingSearchDialog isOpen={true} onClose={mockOnClose} onSelectLocation={mockOnSelectLocation} />);
        expect(screen.getByPlaceholderText(/Type to search/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<GeocodingSearchDialog isOpen={false} onClose={mockOnClose} onSelectLocation={mockOnSelectLocation} />);
        expect(screen.queryByPlaceholderText(/Type to search/i)).not.toBeInTheDocument();
    });

    it('searches after debounce', async () => {
        mockSearchPlaces.mockResolvedValue([]);
        render(<GeocodingSearchDialog isOpen={true} onClose={mockOnClose} onSelectLocation={mockOnSelectLocation} />);

        fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: 'test' } });

        // Timer for debounce
        jest.advanceTimersByTime(500);

        await waitFor(() => {
            expect(mockSearchPlaces).toHaveBeenCalledWith('test');
        });
    });

    it('displays results and allows selection', async () => {
        const mockResults: GeocodingResult[] = [{
            latitude: 1, longitude: 1, displayName: 'Test Place, Country', locality: 'Test Place', country: 'Country'
        }];
        mockSearchPlaces.mockResolvedValue(mockResults);

        render(<GeocodingSearchDialog isOpen={true} onClose={mockOnClose} onSelectLocation={mockOnSelectLocation} />);

        fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: 'test' } });
        jest.advanceTimersByTime(500);

        await waitFor(() => {
            expect(screen.getByText('Test Place')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Test Place'));
        expect(mockOnSelectLocation).toHaveBeenCalledWith(mockResults[0]);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles keyboard navigation', async () => {
        const mockResults: GeocodingResult[] = [
            { latitude: 1, longitude: 1, displayName: 'Place 1', locality: 'P1', country: 'C1' },
            { latitude: 2, longitude: 2, displayName: 'Place 2', locality: 'P2', country: 'C2' }
        ];
        mockSearchPlaces.mockResolvedValue(mockResults);

        render(<GeocodingSearchDialog isOpen={true} onClose={mockOnClose} onSelectLocation={mockOnSelectLocation} />);

        fireEvent.change(screen.getByPlaceholderText(/Type to search/i), { target: { value: 'test' } });
        jest.advanceTimersByTime(500);

        await waitFor(() => {
            const elements = screen.getAllByText('Place 1');
            expect(elements.length).toBeGreaterThan(0);
        });

        const input = screen.getByPlaceholderText(/Type to search/i);

        // Arrow down to select first
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        // Arrow down to select second
        fireEvent.keyDown(input, { key: 'ArrowDown' });

        // Enter to select
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockOnSelectLocation).toHaveBeenCalledWith(mockResults[1]);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
