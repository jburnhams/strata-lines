import { calculateOptimalPositions, refinePositions } from '@/services/titlePositioningService';
import { Place, ExportSettings, PositioningConstraints } from '@/types';
import L from 'leaflet';

// Mock dependencies
jest.mock('@/utils/placeTextRenderer', () => ({
  wrapText: jest.fn((text) => [text]),
  measureTextBounds: jest.fn(),
  titleBoundsToGeoBounds: jest.fn(() => ({} as any)),
  calculateTitleBounds: jest.fn()
}));

jest.mock('@/utils/positioningUtils', () => {
    const actual = jest.requireActual('@/utils/positioningUtils');
    return {
        ...actual,
        geoBoundsToPixelBounds: jest.fn(() => ({ x: 0, y: 0, width: 1000, height: 1000, left: 0, top: 0, right: 1000, bottom: 1000 })),
    };
});

// Mock canvas utils
jest.mock('@/utils/canvasUtils', () => ({
  createCompatibleCanvas: jest.fn(() => {
    return {
      getContext: () => ({
        font: '',
        measureText: () => ({ width: 0 }),
      })
    };
  })
}));

describe('titlePositioningService', () => {
  const mockMap = {
    latLngToLayerPoint: jest.fn((latLng: any) => ({ x: latLng.lng, y: latLng.lat })),
    layerPointToLatLng: jest.fn(() => ({ lat: 0, lng: 0 })),
  } as unknown as L.Map;

  const settings: ExportSettings = {
    includePlaces: true,
    placeTitleSize: 50,
    placeShowIconsGlobally: true,
    placeTextStyle: {
      fontSize: 12,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#000000'
    },
    placeOptimizePositions: true
  };

  const createPlace = (id: string, x: number, y: number): Place => ({
    id,
    latitude: y,
    longitude: x,
    title: `Place ${id}`,
    createdAt: 0,
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin',
    textStyle: { fontSize: 12 } as any
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementation
    const renderer = require('@/utils/placeTextRenderer');

    renderer.measureTextBounds.mockImplementation(({ width }: { width: number }) => ({ width: 50, height: 20 }));

    renderer.calculateTitleBounds.mockImplementation((place: Place, lines: any, fontSize: any, x: number, y: number, position: string) => {
          const width = 50;
          const height = 20;
          const gap = 15; // 10 (half icon) + 5 (gap)
          const top = y - height / 2;

          if (position === 'left') {
              const left = x - gap - width;
              return {
                  left, right: left + width,
                  top, bottom: top + height,
                  width, height,
                  x: left, y: top,
                  toJSON: () => {}
              } as DOMRect;
          } else {
              const left = x + gap;
              return {
                  left, right: left + width,
                  top, bottom: top + height,
                  width, height,
                  x: left, y: top,
                  toJSON: () => {}
              } as DOMRect;
          }
    });
  });

  it('calculates positions for places', () => {
    const places = [createPlace('p1', 100, 100), createPlace('p2', 200, 200)];
    const result = calculateOptimalPositions(places, mockMap, settings);

    expect(result.size).toBe(2);
    expect(result.has('p1')).toBe(true);
    expect(result.has('p2')).toBe(true);
  });

  it('refines positions to avoid overlap', () => {
    // Scenario:
    // Place A at (100, 100). Large text (width 100).
    // Place B at (160, 100). Small text (width 20).

    // A-Right range: 115 to 215. Covers 160.
    // B is at 160.

    const renderer = require('@/utils/placeTextRenderer');

    // Dynamic size mocking
    renderer.measureTextBounds.mockImplementation((lines: string[]) => {
        if (lines[0].includes('Large')) return { width: 100, height: 20 };
        return { width: 20, height: 20 };
    });

    // Dynamic bounds calculation based on text size
    renderer.calculateTitleBounds.mockImplementation((place: Place, lines: string[], fontSize: any, x: number, y: number, position: string) => {
          const isLarge = lines[0].includes('Large');
          const width = isLarge ? 100 : 20;
          const height = 20;
          const gap = 15; // 10 (half icon) + 5 (gap)
          const top = y - height / 2;

          if (position === 'left') {
              const left = x - gap - width;
              return {
                  left, right: left + width,
                  top, bottom: top + height,
                  width, height,
                  x: left, y: top,
                  toJSON: () => {}
              } as DOMRect;
          } else {
              const left = x + gap;
              return {
                  left, right: left + width,
                  top, bottom: top + height,
                  width, height,
                  x: left, y: top,
                  toJSON: () => {}
              } as DOMRect;
          }
    });

    const placeA = createPlace('A', 100, 100);
    placeA.title = 'Large Place A';

    const placeB = createPlace('B', 160, 100);
    placeB.title = 'Small B';

    const places = [placeA, placeB];
    const result = calculateOptimalPositions(places, mockMap, { ...settings, placeOptimizePositions: true });

    expect(result.get('A')).toBe('left');
  });
});
