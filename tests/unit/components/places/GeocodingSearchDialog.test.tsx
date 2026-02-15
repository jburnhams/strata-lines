import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GeocodingSearchDialog } from '@/components/places/GeocodingSearchDialog';
import * as GeocodingService from '@/services/geocodingService';

// Mock the GeocodingService
jest.mock('@/services/geocodingService', () => ({
    getGeocodingService: jest.fn(),
}));

describe('GeocodingSearchDialog', () => {
    const mockOnClose = jest.fn();
    const mockOnSelectLocation = jest.fn();
    const mockSearchPlaces = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (GeocodingService.getGeocodingService as jest.Mock).mockReturnValue({
            searchPlaces: mockSearchPlaces,
        });
    });

    it('does not render when isOpen is false', () => {
        render(
            <GeocodingSearchDialog
                isOpen={false}
                onClose={mockOnClose}
                onSelectLocation={mockOnSelectLocation}
            />
        );
        expect(screen.queryByText('Search Location')).not.toBeInTheDocument();
    });

    it('renders in a portal when isOpen is true', () => {
        render(
            <GeocodingSearchDialog
                isOpen={true}
                onClose={mockOnClose}
                onSelectLocation={mockOnSelectLocation}
            />
        );
        // Because it's a portal to document.body, it should be in the document
        expect(screen.getByText('Search Location')).toBeInTheDocument();

        // Verify input is present
        expect(screen.getByPlaceholderText(/Type to search/i)).toBeInTheDocument();
    });

    it('searches when typing', async () => {
        mockSearchPlaces.mockResolvedValue([
            { displayName: 'Test Place, City', latitude: 10, longitude: 20 },
        ]);

        render(
            <GeocodingSearchDialog
                isOpen={true}
                onClose={mockOnClose}
                onSelectLocation={mockOnSelectLocation}
            />
        );

        const input = screen.getByPlaceholderText(/Type to search/i);
        fireEvent.change(input, { target: { value: 'Test' } });

        await waitFor(() => {
            expect(mockSearchPlaces).toHaveBeenCalledWith('Test');
        });

        expect(await screen.findByText('Test Place')).toBeInTheDocument();
    });

    it('selects a location on click', async () => {
        const mockResult = { displayName: 'Selected Place', latitude: 10, longitude: 20 };
        mockSearchPlaces.mockResolvedValue([mockResult]);

        render(
            <GeocodingSearchDialog
                isOpen={true}
                onClose={mockOnClose}
                onSelectLocation={mockOnSelectLocation}
            />
        );

        const input = screen.getByPlaceholderText(/Type to search/i);
        fireEvent.change(input, { target: { value: 'Select' } });

        const resultItems = await screen.findAllByText('Selected Place');
        fireEvent.click(resultItems[0]);

        expect(mockOnSelectLocation).toHaveBeenCalledWith(mockResult);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes on close button click', () => {
        render(
            <GeocodingSearchDialog
                isOpen={true}
                onClose={mockOnClose}
                onSelectLocation={mockOnSelectLocation}
            />
        );

        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });
});
