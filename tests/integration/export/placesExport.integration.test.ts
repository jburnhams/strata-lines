
import { renderCanvasForBounds } from '@/utils/exportHelpers';
import * as placeRenderingService from '@/services/placeRenderingService';
import L from 'leaflet';
import { Place } from '@/types';

// Mock the service
jest.mock('@/services/placeRenderingService', () => ({
    renderPlacesOnCanvas: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/utils/canvasUtils', () => ({
    createCompatibleCanvas: (w: number, h: number) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createCanvas } = require('@napi-rs/canvas');
        return createCanvas(w, h);
    }
}));


describe('Places Export Integration', () => {
    const bounds = L.latLngBounds([0, 0], [0.01, 0.01]);
    const places: Place[] = [
        {
            id: 'p1',
            title: 'Export Place',
            latitude: 0.005,
            longitude: 0.005,
            createdAt: 0,
            source: 'manual',
            isVisible: true,
            showIcon: true,
            iconStyle: 'pin',
        }
    ];

    it('calls renderPlacesOnCanvas with correct high-res parameters', async () => {
        const placeSettings = {
            includePlaces: true,
            placeTitleSize: 50,
            placeShowIconsGlobally: true,
            placeTextStyle: { fontSize: 12 } as any,
            placePreferredTitleGap: 20,
            placeAllowOverlap: true,
            placeOptimizePositions: true
        };

        await renderCanvasForBounds({
            bounds,
            layerType: 'places',
            zoomForRender: 15, // High zoom
            visiblePlaces: places,
            placeSettings,
            renderScale: 2 // Retina
        });

        expect(placeRenderingService.renderPlacesOnCanvas).toHaveBeenCalledTimes(1);
        const args = (placeRenderingService.renderPlacesOnCanvas as jest.Mock).mock.calls[0];

        // args: canvas, places, bounds, zoom, settings, tileLayerUrl
        const canvas = args[0];
        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.height).toBeGreaterThan(0);
        expect(args[1]).toEqual(places);
        expect(args[3]).toBe(15);
        expect(args[4]).toEqual(placeSettings);
    });
});
