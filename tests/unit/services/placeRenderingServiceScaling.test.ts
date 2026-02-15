
import { renderPlace } from '@/services/placeRenderingService';
import { Place, ExportSettings } from '@/types';
import { renderIcon } from '@/utils/placeIconRenderer';
import { renderTextWithEffects } from '@/utils/placeTextRenderer';

// Mock dependencies
jest.mock('@/utils/placeIconRenderer', () => ({
    renderIcon: jest.fn(),
}));

jest.mock('@/utils/placeTextRenderer', () => ({
    wrapText: jest.fn().mockReturnValue(['Test Place']),
    measureTextBounds: jest.fn().mockReturnValue({ width: 100, height: 20 }),
    renderTextWithEffects: jest.fn(),
    getAutoTextColor: jest.fn().mockResolvedValue('#000000'),
}));

describe('placeRenderingService - Scaling', () => {
    let mockCtx: Partial<CanvasRenderingContext2D>;

    const mockPlace: Place = {
        id: 'p1',
        latitude: 0,
        longitude: 0,
        title: 'Test Place',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin',
        textStyle: {
            fontSize: 12,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            color: '#000000',
            strokeColor: '#ffffff',
            strokeWidth: 2
        },
        createdAt: Date.now(),
        source: 'manual'
    };

    const mockSettings: ExportSettings = {
        includePlaces: true,
        placeTitleSize: 50, // This results in scale 1.0 for title size
        placeShowIconsGlobally: true,
        placeTextStyle: mockPlace.textStyle!,
        placePreferredTitleGap: 20,
        placeAllowOverlap: true,
        placeOptimizePositions: true
    };

    beforeEach(() => {
        mockCtx = {
            save: jest.fn(),
            restore: jest.fn(),
            fillText: jest.fn(),
            strokeText: jest.fn(),
            measureText: jest.fn().mockReturnValue({ width: 50, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 } as TextMetrics),
        };
        (renderIcon as jest.Mock).mockClear();
        (renderTextWithEffects as jest.Mock).mockClear();
    });

    it('uses scale 4 at zoom 12 (ref 10)', async () => {
        await renderPlace(mockCtx as CanvasRenderingContext2D, mockPlace, 100, 100, mockSettings, 12);

        // Scale is 2^(12-10) = 4.
        // Icon size: 24 * 4 = 96
        expect(renderIcon).toHaveBeenCalledWith(
            expect.anything(),
            'pin',
            100,
            100,
            96,
            expect.any(String)
        );

        // Font size: 12 * 4 = 48
        expect(renderTextWithEffects).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ fontSize: 48 })
        );
    });

    it('uses scale 8 (max) at zoom 13', async () => {
        await renderPlace(mockCtx as CanvasRenderingContext2D, mockPlace, 100, 100, mockSettings, 13);

        // Scale is 2^(13-10) = 8. (Max clamped)
        // Icon size: 24 * 8 = 192
        expect(renderIcon).toHaveBeenCalledWith(
            expect.anything(),
            'pin',
            100,
            100,
            192,
            expect.any(String)
        );

        // Font size: 12 * 8 = 96
        expect(renderTextWithEffects).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ fontSize: 96 })
        );
    });

    it('uses scale 0.5 (min) at zoom 8', async () => {
        await renderPlace(mockCtx as CanvasRenderingContext2D, mockPlace, 100, 100, mockSettings, 8);

        // Scale is 2^(8-10) = 0.25 -> clamped to 0.5
        // Icon size: 24 * 0.5 = 12
        expect(renderIcon).toHaveBeenCalledWith(
            expect.anything(),
            'pin',
            100,
            100,
            12,
            expect.any(String)
        );

        // Font size: 12 * 0.5 = 6
        expect(renderTextWithEffects).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ fontSize: 6 })
        );
    });
});
