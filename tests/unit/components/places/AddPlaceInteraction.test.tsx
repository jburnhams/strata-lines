
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaceControls } from '@/components/places/PlaceControls';
import { GeocodingResult } from '@/services/geocoding/GeocodingProvider';
import '@testing-library/jest-dom';

// Mock GeocodingService
jest.mock('@/services/geocodingService', () => ({
    getGeocodingService: () => ({
        searchPlaces: jest.fn().mockResolvedValue([])
    })
}));

describe('PlaceControls - Add Place Interaction', () => {
    const mockProps = {
        onAddPlace: jest.fn(),
        allPlacesVisible: true,
        onToggleAllVisibility: jest.fn(),
        placeCount: 0,
        onDeleteAll: jest.fn(),
        activeTrackId: null, // No active track -> should open dialog
    };

    it('opens search dialog when Add Place is clicked and no track is active', async () => {
        render(<PlaceControls {...mockProps} />);

        // Dialog should not be visible initially
        expect(screen.queryByText('Search Location')).not.toBeInTheDocument();

        // Click Add Place
        fireEvent.click(screen.getByText('Add Place'));

        // Verify logging (optional/implied)

        // Dialog should appear
        // Note: It uses a Portal, so we check document.body implicitly by using screen queries
        await waitFor(() => {
            expect(screen.getByText('Search Location')).toBeInTheDocument();
        });

        // Verify input is focused (implementation detail, but good to check)
        // const input = screen.getByPlaceholderText('Search for a place...');
        // expect(input).toHaveFocus();
    });

    it('calls onAddPlace directly when activeTrackId is present', () => {
        const propsWithTrack = { ...mockProps, activeTrackId: 'track-123' };
        render(<PlaceControls {...propsWithTrack} />);

        fireEvent.click(screen.getByText('Add Place'));

        expect(mockProps.onAddPlace).toHaveBeenCalled();
        expect(screen.queryByText('Search Location')).not.toBeInTheDocument();
    });
});
