
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

    it('uses base size at reference zoom (12)', async () => {
        await renderPlace(mockCtx as CanvasRenderingContext2D, mockPlace, 100, 100, mockSettings, 12);

        // Check Icon Size
        // Default size is 24. Scale is 2^(12-12) = 1.
        expect(renderIcon).toHaveBeenCalledWith(
            expect.anything(),
            'pin',
            100,
            100,
            24, // Expected size
            expect.any(String)
        );

        // Check Font Size via renderTextWithEffects call
        // Base font size 12 * titleSizeScale (1). Scale 1.
        expect(renderTextWithEffects).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ fontSize: 12 })
        );
    });

    it('doubles size at zoom 13', async () => {
        await renderPlace(mockCtx as CanvasRenderingContext2D, mockPlace, 100, 100, mockSettings, 13);

        // Scale is 2^(13-12) = 2.
        // Icon size: 24 * 2 = 48
        expect(renderIcon).toHaveBeenCalledWith(
            expect.anything(),
            'pin',
            100,
            100,
            48,
            expect.any(String)
        );

        // Font size: 12 * 2 = 24
        expect(renderTextWithEffects).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ fontSize: 24 })
        );
    });

    it('halves size at zoom 11', async () => {
        await renderPlace(mockCtx as CanvasRenderingContext2D, mockPlace, 100, 100, mockSettings, 11);

        // Scale is 2^(11-12) = 0.5.
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
