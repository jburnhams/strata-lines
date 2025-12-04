
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import { PlaceCanvasOverlay } from '@/components/places/PlaceCanvasOverlay';
import { Place } from '@/types';
import * as placeRenderingService from '@/services/placeRenderingService';
import * as titlePositioningService from '@/services/titlePositioningService';
import L from 'leaflet';

// Mock services
jest.mock('@/services/placeRenderingService', () => ({
    renderPlacesOnCanvas: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/titlePositioningService', () => ({
    calculateOptimalPositions: jest.fn(),
}));

jest.mock('@/hooks/useLocalStorage', () => ({
    useLocalStorage: (key: string, defaultVal: any) => [defaultVal, jest.fn()],
}));

// Mock requestAnimationFrame
const originalRAF = window.requestAnimationFrame;
const originalCAF = window.cancelAnimationFrame;

beforeAll(() => {
    window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
});

afterAll(() => {
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCAF;
});

const places: Place[] = [
    {
        id: 'p1',
        title: 'Place 1',
        latitude: 51.505,
        longitude: -0.09,
        createdAt: Date.now(),
        source: 'manual',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin',
    }
];

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ width: '800px', height: '600px' }}>
        {children}
    </MapContainer>
);

describe('PlacePositioning Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (titlePositioningService.calculateOptimalPositions as jest.Mock).mockReturnValue(new Map([['p1', 'right']]));
    });

    it('calculates positions on initial render', async () => {
        await act(async () => {
            render(
                <Wrapper>
                    <PlaceCanvasOverlay places={places} />
                </Wrapper>
            );
        });

        await waitFor(() => {
            expect(titlePositioningService.calculateOptimalPositions).toHaveBeenCalled();
            expect(placeRenderingService.renderPlacesOnCanvas).toHaveBeenCalled();
        });
    });

    it('caches positions when map moves slightly but zoom stays same', async () => {
        let mapInstance: L.Map | undefined;

        const MapUser = () => {
            const map = require('react-leaflet').useMap();
            mapInstance = map;
            return null;
        };

        await act(async () => {
            render(
                <Wrapper>
                    <PlaceCanvasOverlay places={places} />
                    <MapUser />
                </Wrapper>
            );
        });

        await waitFor(() => expect(titlePositioningService.calculateOptimalPositions).toHaveBeenCalledTimes(1));

        // Pan map slightly
        await act(async () => {
            mapInstance?.panBy([10, 10]);
            mapInstance?.fire('move'); // Force event
        });

        // renderPlacesOnCanvas should be called again (re-render)
        // But calculateOptimalPositions should NOT be called again if zoom didn't change (and logic holds)
        // Wait, the logic in PlaceCanvasOverlay checks:
        // if (!positionsRef.current || Math.abs(zoom - lastCalcZoomRef.current) > 0.05 ...)

        await waitFor(() => {
            expect(placeRenderingService.renderPlacesOnCanvas).toHaveBeenCalledTimes(2);
        });

        // Should still be 1 if cached
        expect(titlePositioningService.calculateOptimalPositions).toHaveBeenCalledTimes(1);
    });

    it('re-calculates positions on zoom change', async () => {
        let mapInstance: L.Map | undefined;
        const MapUser = () => {
            const map = require('react-leaflet').useMap();
            mapInstance = map;
            return null;
        };

        await act(async () => {
            render(
                <Wrapper>
                    <PlaceCanvasOverlay places={places} />
                    <MapUser />
                </Wrapper>
            );
        });

        await waitFor(() => expect(titlePositioningService.calculateOptimalPositions).toHaveBeenCalledTimes(1));

        await act(async () => {
            mapInstance?.setZoom(14);
            mapInstance?.fire('zoom');
        });

        await waitFor(() => {
            expect(titlePositioningService.calculateOptimalPositions).toHaveBeenCalledTimes(2);
        });
    });
});
