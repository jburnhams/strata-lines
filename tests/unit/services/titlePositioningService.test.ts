import { calculateOptimalPositions } from '@/services/titlePositioningService';
import { Place, ExportSettings, PositioningConstraints } from '@/types';
import L from 'leaflet';

// Mock dependencies
jest.mock('@/utils/placeTextRenderer', () => ({
  wrapText: jest.fn(() => ['Line 1']),
  measureTextBounds: jest.fn(() => ({ width: 50, height: 20 })),
  titleBoundsToGeoBounds: jest.fn(() => ({} as any)),
}));

jest.mock('@/utils/positioningUtils', () => ({
  ...jest.requireActual('@/utils/positioningUtils'),
  geoBoundsToPixelBounds: jest.fn(() => ({ x: 0, y: 0, width: 1000, height: 1000, left: 0, top: 0, right: 1000, bottom: 1000 })),
}));

describe('titlePositioningService', () => {
  const mockMap = {
    latLngToLayerPoint: jest.fn((latLng: any) => ({ x: 100, y: 100 })),
    layerPointToLatLng: jest.fn(() => ({ lat: 0, lng: 0 })),
  } as unknown as L.Map;

  const settings: ExportSettings = {
    includePlaces: true,
    placeTitleSize: 50, // Scale 1
    placeShowIconsGlobally: true,
    placeTextStyle: {
      fontSize: 12,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#000000'
    }
  };

  const places: Place[] = [
    {
      id: 'p1',
      latitude: 0,
      longitude: 0,
      title: 'Place 1',
      createdAt: 0,
      source: 'manual',
      isVisible: true,
      showIcon: true,
      iconStyle: 'pin',
      textStyle: { fontSize: 12 } as any
    },
    {
      id: 'p2',
      latitude: 0,
      longitude: 0,
      title: 'Place 2',
      createdAt: 0,
      source: 'manual',
      isVisible: true,
      showIcon: true,
      iconStyle: 'pin',
      textStyle: { fontSize: 12 } as any
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates positions for places', () => {
    (mockMap.latLngToLayerPoint as jest.Mock)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const result = calculateOptimalPositions(places, mockMap, settings);

    expect(result.size).toBe(2);
    expect(result.has('p1')).toBe(true);
    expect(result.has('p2')).toBe(true);
  });

  it('handles overlapping places by choosing different sides', () => {
    // Places at same location
    (mockMap.latLngToLayerPoint as jest.Mock).mockReturnValue({ x: 100, y: 100 });

    const result = calculateOptimalPositions(places, mockMap, settings);

    const p1Pos = result.get('p1');
    const p2Pos = result.get('p2');

    // p1 placed first -> right
    // p2 placed second -> left (to avoid p1)

    expect(p1Pos).toBe('right');
    expect(p2Pos).toBe('left');
  });
});
