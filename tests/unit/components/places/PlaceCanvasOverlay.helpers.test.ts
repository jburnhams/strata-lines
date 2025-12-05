import { getPlaceAtPoint, isPointInBounds } from '@/components/places/PlaceCanvasOverlay';
import type { PlaceRenderResult } from '@/services/placeRenderingService';

describe('PlaceCanvasOverlay helpers', () => {
    describe('isPointInBounds', () => {
        const bounds = { x: 100, y: 100, width: 50, height: 50 };

        it('returns true for point inside', () => {
            expect(isPointInBounds(125, 125, bounds)).toBe(true);
        });

        it('returns true for point within padding', () => {
            expect(isPointInBounds(95, 100, bounds)).toBe(true); // Left padding (5px)
            expect(isPointInBounds(155, 100, bounds)).toBe(true); // Right padding
        });

        it('returns false for point outside', () => {
            expect(isPointInBounds(90, 100, bounds)).toBe(false);
            expect(isPointInBounds(160, 100, bounds)).toBe(false);
        });
    });

    describe('getPlaceAtPoint', () => {
        const results = new Map<string, PlaceRenderResult>();
        results.set('bottom', {
            totalBounds: { x: 0, y: 0, width: 0, height: 0 },
            iconBounds: { x: 100, y: 100, width: 20, height: 20 }
        });
        results.set('top', {
            totalBounds: { x: 0, y: 0, width: 0, height: 0 },
            iconBounds: { x: 110, y: 110, width: 20, height: 20 } // Overlaps
        });

        it('returns topmost place when overlapping', () => {
            // Overlap area (110, 110)
            // 'top' is inserted last, so it's checked first
            expect(getPlaceAtPoint(115, 115, results)).toBe('top');
        });

        it('returns correct place when no overlap', () => {
            expect(getPlaceAtPoint(100, 100, results)).toBe('bottom'); // Only bottom is here (105 hits top's padding)
        });

        it('returns null when no hit', () => {
            expect(getPlaceAtPoint(0, 0, results)).toBeNull();
        });
    });
});
