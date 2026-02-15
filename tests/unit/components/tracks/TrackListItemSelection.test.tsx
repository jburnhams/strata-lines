
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackListItem } from '@/components/tracks/TrackListItem';
import '@testing-library/jest-dom';

const mockTrack = {
    id: 'track-1',
    name: 'Test Track',
    length: 10.5,
    isVisible: true,
    filename: 'test.gpx'
};

const mockHandlers = {
    onHover: jest.fn(),
    onToggleVisibility: jest.fn(),
    onRemove: jest.fn(),
    createTrackPlace: jest.fn(),
    removeTrackPlace: jest.fn(),
    createAllTrackPlaces: jest.fn(),
    removeAllTrackPlaces: jest.fn(),
    onClick: jest.fn()
};

describe('TrackListItem Selection', () => {
    it('calls onClick when clicked', () => {
        render(<TrackListItem track={mockTrack as any} {...mockHandlers} />);

        // Click on the track name/item
        fireEvent.click(screen.getByText('Test Track'));

        expect(mockHandlers.onClick).toHaveBeenCalledWith('track-1');
    });

    it('does not crash if onClick is undefined', () => {
        const { onClick, ...rest } = mockHandlers;
        render(<TrackListItem track={mockTrack as any} {...rest} />);

        fireEvent.click(screen.getByText('Test Track'));
        // Should not throw
    });
});
