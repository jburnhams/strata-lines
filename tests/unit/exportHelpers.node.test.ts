import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import L from 'leaflet';
import { renderCanvasForBounds } from '@/utils/exportHelpers';

// Mock html2canvas
jest.mock('html2canvas', () => jest.fn());
import html2canvas from 'html2canvas';

// Mock Leaflet
jest.mock('leaflet', () => {
    const original: any = jest.requireActual('leaflet');
    return {
        ...original,
        map: jest.fn(),
        tileLayer: jest.fn(() => ({
            addTo: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            isLoading: jest.fn().mockReturnValue(false)
        })),
        polyline: jest.fn(() => ({
            addTo: jest.fn(),
            on: jest.fn()
        })),
    };
});

// Mock @napi-rs/canvas
jest.mock('@napi-rs/canvas', () => ({
    createCanvas: jest.fn((w: number, h: number) => {
        return {
            width: w,
            height: h,
            getContext: jest.fn(() => ({
                drawImage: jest.fn(),
                clearRect: jest.fn(),
                scale: jest.fn(),
                putImageData: jest.fn(),
            })),
            tagName: 'CANVAS',
            constructor: { name: 'CanvasElement' }
        };
    }),
    loadImage: jest.fn(() => Promise.resolve({ width: 256, height: 256 })),
}), { virtual: true });

// Mock createCompatibleCanvas to return a mock that accepts our custom mock canvas
jest.mock('@/utils/canvasUtils', () => ({
    createCompatibleCanvas: jest.fn((w: number, h: number) => ({
        width: w,
        height: h,
        getContext: jest.fn(() => ({
            drawImage: jest.fn(),
            clearRect: jest.fn(),
            scale: jest.fn(),
        }))
    }))
}));

describe('exportHelpers (Node Environment)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should use manual composition instead of html2canvas in Node', async () => {
        const bounds = L.latLngBounds([0, 0], [1, 1]);

        // Mock map container
        const mockContainer = document.createElement('div');
        // Add some mock tiles to container
        const tile = document.createElement('img');
        tile.className = 'leaflet-tile';
        tile.src = 'http://example.com/tile.png';
        tile.style.left = '10px';
        tile.style.top = '20px';
        tile.width = 256;
        tile.height = 256;
        mockContainer.appendChild(tile);

        (L.map as jest.Mock).mockReturnValue({
            getContainer: () => mockContainer,
            setView: jest.fn(),
            invalidateSize: jest.fn(),
            getBounds: () => bounds,
            latLngToContainerPoint: () => ({ x: 0, y: 0 }),
            remove: jest.fn(),
            getRenderer: () => ({ _container: document.createElement('canvas'), on: jest.fn() }),
            project: jest.fn(() => ({ x: 0, y: 0 })),
        });

        await renderCanvasForBounds({
            bounds,
            layerType: 'base',
            zoomForRender: 10
        });

        // Verify html2canvas was NOT called
        expect(html2canvas).not.toHaveBeenCalled();

        // Verify @napi-rs/canvas was used
        const { loadImage } = require('@napi-rs/canvas');
        expect(loadImage).toHaveBeenCalledWith('http://example.com/tile.png');
    });
});
